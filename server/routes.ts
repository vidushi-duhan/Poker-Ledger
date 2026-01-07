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
      const parsed = insertGameSchema.parse(req.body);
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
      const { finalAmounts } = req.body as { 
        finalAmounts: { playerId: string; finalAmount: number }[] 
      };

      // Validate finalAmounts is an array
      if (!Array.isArray(finalAmounts)) {
        return res.status(400).json({ error: "finalAmounts must be an array" });
      }

      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      if (game.status === "completed") {
        return res.status(400).json({ error: "Game already completed" });
      }

      const gamePlayers = await storage.getGamePlayers(gameId);

      // Validate request: check for duplicates and count match
      const playerIdsInRequest = finalAmounts.map(fa => fa.playerId);
      const uniquePlayerIds = new Set(playerIdsInRequest);
      
      if (uniquePlayerIds.size !== playerIdsInRequest.length) {
        return res.status(400).json({ 
          error: "Duplicate player entries in final amounts" 
        });
      }
      
      if (finalAmounts.length !== gamePlayers.length) {
        return res.status(400).json({ 
          error: "Final amounts count must match number of players in game",
          expected: gamePlayers.length,
          received: finalAmounts.length
        });
      }
      
      // Validate and coerce numeric inputs for ALL players
      const validatedAmounts: { playerId: string; finalAmount: number }[] = [];
      
      // Require all players in the game to have final amounts
      for (const gp of gamePlayers) {
        const fa = finalAmounts.find(a => a.playerId === gp.playerId);
        if (!fa) {
          return res.status(400).json({ 
            error: `Missing final amount for player ${gp.player.name}` 
          });
        }
        // Use Number for proper numeric coercion (preserves decimals)
        const amount = Number(fa.finalAmount);
        if (!Number.isFinite(amount)) {
          return res.status(400).json({ 
            error: `Invalid amount for player ${gp.player.name}` 
          });
        }
        validatedAmounts.push({ playerId: gp.playerId, finalAmount: amount });
      }

      // Calculate total buy-ins and final amounts to verify balance
      let totalBuyIns = 0;
      let totalFinalAmounts = 0;

      for (const gp of gamePlayers) {
        totalBuyIns += gp.buyInCount * game.defaultBuyIn;
        const fa = validatedAmounts.find(a => a.playerId === gp.playerId);
        if (fa) {
          totalFinalAmounts += fa.finalAmount;
        }
      }

      if (totalBuyIns !== totalFinalAmounts) {
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

      for (const fa of validatedAmounts) {
        const gp = gamePlayers.find(g => g.playerId === fa.playerId);
        if (gp) {
          const totalBuyIn = gp.buyInCount * game.defaultBuyIn;
          const netResult = fa.finalAmount - totalBuyIn;

          // Update game player with final amount and net result
          await storage.updateGamePlayer(gp.id, {
            finalAmount: fa.finalAmount,
            netResult: netResult,
          });

          // Update player's total balance
          await storage.updatePlayerBalance(fa.playerId, netResult, true);

          playerBalances.push({
            playerId: fa.playerId,
            playerName: gp.player.name,
            netResult,
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
