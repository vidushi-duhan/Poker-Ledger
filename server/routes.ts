import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlayerSchema, insertGameSchema, insertGamePlayerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Players API
  app.get("/api/players", async (_req, res) => {
    try {
      const players = await storage.getAllPlayers();
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.post("/api/players", async (req, res) => {
    try {
      const parsed = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(parsed);
      res.status(201).json(player);
    } catch (error) {
      console.error("Error creating player:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create player" });
      }
    }
  });

  // Games API
  app.get("/api/games", async (_req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.get("/api/games/active", async (_req, res) => {
    try {
      const game = await storage.getActiveGame();
      res.json(game);
    } catch (error) {
      console.error("Error fetching active game:", error);
      res.status(500).json({ error: "Failed to fetch active game" });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const parsed = z.object({
        defaultBuyIn: z.number().int().positive(),
        chipsPerBuyIn: z.number().int().positive(),
      }).parse(req.body);
      
      const game = await storage.createGame(parsed);
      res.status(201).json(game);
    } catch (error) {
      console.error("Error creating game:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create game" });
      }
    }
  });

  app.post("/api/games/:id/complete", async (req, res) => {
    try {
      const gameId = req.params.id;
      const { finalChips } = req.body as { 
        finalChips: { playerId: string; chips: number }[] 
      };

      // Validate finalChips is an array
      if (!Array.isArray(finalChips)) {
        return res.status(400).json({ error: "finalChips must be an array" });
      }

      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      if (game.status === "completed") {
        return res.status(400).json({ error: "Game already completed" });
      }

      const gamePlayers = await storage.getGamePlayers(gameId);
      const conversionRatio = game.chipsPerBuyIn / game.defaultBuyIn;

      // Validate request: check for duplicates and count match
      const playerIdsInRequest = finalChips.map(fc => fc.playerId);
      const uniquePlayerIds = new Set(playerIdsInRequest);
      
      if (uniquePlayerIds.size !== playerIdsInRequest.length) {
        return res.status(400).json({ 
          error: "Duplicate player entries in final chips" 
        });
      }
      
      if (finalChips.length !== gamePlayers.length) {
        return res.status(400).json({ 
          error: "Final chips count must match number of players in game",
          expected: gamePlayers.length,
          received: finalChips.length
        });
      }
      
      // Validate and calculate monetary values
      const validatedData: { playerId: string; chips: number; amount: number }[] = [];
      
      for (const gp of gamePlayers) {
        const fc = finalChips.find(c => c.playerId === gp.playerId);
        if (!fc) {
          return res.status(400).json({ 
            error: `Missing final chips for player ${gp.player.name}` 
          });
        }
        const chips = Number(fc.chips);
        if (!Number.isFinite(chips)) {
          return res.status(400).json({ 
            error: `Invalid chips for player ${gp.player.name}` 
          });
        }
        // Calculate monetary value based on ratio
        const amount = chips / conversionRatio;
        validatedData.push({ playerId: gp.playerId, chips, amount });
      }

      // Calculate total buy-ins and final amounts to verify balance
      let totalBuyIns = 0;
      let totalFinalAmounts = 0;

      for (const gp of gamePlayers) {
        totalBuyIns += gp.buyInCount * game.defaultBuyIn;
        const vd = validatedData.find(d => d.playerId === gp.playerId);
        if (vd) {
          totalFinalAmounts += vd.amount;
        }
      }

      // Using a small epsilon for floating point comparison if needed, 
      // but since we're dealing with money, we should be careful.
      if (Math.abs(totalBuyIns - totalFinalAmounts) > 0.01) {
        return res.status(400).json({ 
          error: "Totals don't balance", 
          totalBuyIns, 
          totalFinalAmounts,
          difference: totalBuyIns - totalFinalAmounts 
        });
      }

      // Delete existing settlements for this game (in case of retry)
      await storage.deleteSettlementsByGame(gameId);

      // Calculate net results and update game players
      const playerBalances: { playerId: string; playerName: string; netResult: number }[] = [];

      for (const vd of validatedData) {
        const gp = gamePlayers.find(g => g.playerId === vd.playerId);
        if (gp) {
          const totalBuyIn = gp.buyInCount * game.defaultBuyIn;
          const netResult = vd.amount - totalBuyIn;

          // Update game player with final amount and net result
          await storage.updateGamePlayer(gp.id, {
            finalChips: vd.chips,
            finalAmount: Math.round(vd.amount),
            netResult: Math.round(netResult),
          });

          // Update player's total balance
          await storage.updatePlayerBalance(vd.playerId, Math.round(netResult), true);

          playerBalances.push({
            playerId: vd.playerId,
            playerName: gp.player.name,
            netResult: Math.round(netResult),
          });
        }
      }

      // Calculate settlements (minimize transactions)
      const losers = playerBalances
        .filter(p => p.netResult < 0)
        .map(p => ({ ...p, remaining: Math.abs(p.netResult) }))
        .sort((a, b) => b.remaining - a.remaining);

      const winners = playerBalances
        .filter(p => p.netResult > 0)
        .map(p => ({ ...p, remaining: p.netResult }))
        .sort((a, b) => b.remaining - a.remaining);

      let loserIdx = 0;
      let winnerIdx = 0;

      while (loserIdx < losers.length && winnerIdx < winners.length) {
        const loser = losers[loserIdx];
        const winner = winners[winnerIdx];

        const amount = Math.min(loser.remaining, winner.remaining);

        if (amount > 0) {
          await storage.createSettlement({
            gameId,
            fromPlayerId: loser.playerId,
            toPlayerId: winner.playerId,
            amount,
          });

          loser.remaining -= amount;
          winner.remaining -= amount;
        }

        if (loser.remaining === 0) loserIdx++;
        if (winner.remaining === 0) winnerIdx++;
      }

      // Complete game with total pot
      await storage.completeGame(gameId, totalBuyIns);

      res.json({ success: true });
    } catch (error) {
      console.error("Error completing game:", error);
      res.status(500).json({ error: "Failed to complete game" });
    }
  });

  app.post("/api/games/:id/cancel", async (req, res) => {
    try {
      const gameId = req.params.id;

      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      if (game.status === "completed") {
        return res.status(400).json({ error: "Cannot cancel a completed game" });
      }

      if (game.status === "cancelled") {
        return res.status(400).json({ error: "Game already cancelled" });
      }

      await storage.cancelGame(gameId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling game:", error);
      res.status(500).json({ error: "Failed to cancel game" });
    }
  });

  app.delete("/api/games/:id", async (req, res) => {
    try {
      const gameId = req.params.id;

      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      // Only allow deleting completed games (not active ones)
      if (game.status === "active") {
        return res.status(400).json({ error: "Cannot delete an active game. Cancel it first." });
      }

      // If game was completed, reverse the ledger balances
      if (game.status === "completed") {
        const gamePlayers = await storage.getGamePlayers(gameId);
        
        for (const gp of gamePlayers) {
          if (gp.netResult !== null) {
            // Reverse the balance change
            await storage.updatePlayerBalance(gp.playerId, -gp.netResult, false);
            // Decrement games played count
            await storage.decrementPlayerGamesPlayed(gp.playerId);
          }
        }
      }

      // Delete all related data in order (settlements, game players, then game)
      await storage.deleteSettlementsByGame(gameId);
      await storage.deleteGamePlayers(gameId);
      await storage.deleteGame(gameId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting game:", error);
      res.status(500).json({ error: "Failed to delete game" });
    }
  });

  // Game Players API
  app.post("/api/game-players", async (req, res) => {
    try {
      const parsed = insertGamePlayerSchema.parse(req.body);
      
      // Check if player is already in this game
      const existingPlayers = await storage.getGamePlayers(parsed.gameId);
      const alreadyInGame = existingPlayers.some(gp => gp.playerId === parsed.playerId);
      
      if (alreadyInGame) {
        return res.status(400).json({ error: "Player is already in this game" });
      }
      
      const gamePlayer = await storage.addPlayerToGame(parsed);
      res.status(201).json(gamePlayer);
    } catch (error) {
      console.error("Error adding player to game:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to add player to game" });
      }
    }
  });

  app.patch("/api/game-players/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { buyInCount } = req.body;
      
      const gamePlayer = await storage.updateGamePlayer(id, { buyInCount });
      if (!gamePlayer) {
        return res.status(404).json({ error: "Game player not found" });
      }
      res.json(gamePlayer);
    } catch (error) {
      console.error("Error updating game player:", error);
      res.status(500).json({ error: "Failed to update game player" });
    }
  });

  app.delete("/api/game-players/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removePlayerFromGame(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing player from game:", error);
      res.status(500).json({ error: "Failed to remove player from game" });
    }
  });

  // Settlements API
  app.get("/api/settlements", async (_req, res) => {
    try {
      const allSettlements = await storage.getAllSettlements();
      res.json(allSettlements);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      res.status(500).json({ error: "Failed to fetch settlements" });
    }
  });

  return httpServer;
}
