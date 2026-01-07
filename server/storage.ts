import { 
  players, games, gamePlayers, settlements,
  type Player, type InsertPlayer,
  type Game, type InsertGame,
  type GamePlayer, type InsertGamePlayer,
  type Settlement, type InsertSettlement,
  type GamePlayerWithPlayer, type GameWithPlayers, type SettlementWithPlayers
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Players
  getAllPlayers(): Promise<Player[]>;
  getPlayer(id: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerBalance(id: string, balanceChange: number, incrementGames?: boolean): Promise<Player | undefined>;

  // Games
  getAllGames(): Promise<GameWithPlayers[]>;
  getActiveGame(): Promise<GameWithPlayers | null>;
  getGame(id: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  updateGameStatus(id: string, status: string): Promise<Game | undefined>;
  completeGame(id: string, totalPot: number): Promise<Game | undefined>;

  // Game Players
  getGamePlayers(gameId: string): Promise<GamePlayerWithPlayer[]>;
  addPlayerToGame(gamePlayer: InsertGamePlayer): Promise<GamePlayer>;
  updateGamePlayer(id: string, data: Partial<GamePlayer>): Promise<GamePlayer | undefined>;
  removePlayerFromGame(id: string): Promise<void>;

  // Settlements
  getAllSettlements(): Promise<SettlementWithPlayers[]>;
  getSettlementsByGame(gameId: string): Promise<SettlementWithPlayers[]>;
  createSettlement(settlement: InsertSettlement): Promise<Settlement>;
  deleteSettlementsByGame(gameId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Players
  async getAllPlayers(): Promise<Player[]> {
    return await db.select().from(players).orderBy(desc(players.totalBalance));
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player || undefined;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(insertPlayer).returning();
    return player;
  }

  async updatePlayerBalance(id: string, balanceChange: number, incrementGames = false): Promise<Player | undefined> {
    const player = await this.getPlayer(id);
    if (!player) return undefined;

    const [updated] = await db
      .update(players)
      .set({
        totalBalance: player.totalBalance + balanceChange,
        gamesPlayed: incrementGames ? player.gamesPlayed + 1 : player.gamesPlayed,
      })
      .where(eq(players.id, id))
      .returning();
    return updated;
  }

  // Games
  async getAllGames(): Promise<GameWithPlayers[]> {
    const allGames = await db.select().from(games).orderBy(desc(games.date));
    const result: GameWithPlayers[] = [];

    for (const game of allGames) {
      const gps = await this.getGamePlayers(game.id);
      result.push({ ...game, gamePlayers: gps });
    }

    return result;
  }

  async getActiveGame(): Promise<GameWithPlayers | null> {
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.status, "active"))
      .orderBy(desc(games.date))
      .limit(1);

    if (!game) return null;

    const gps = await this.getGamePlayers(game.id);
    return { ...game, gamePlayers: gps };
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(insertGame).returning();
    return game;
  }

  async updateGameStatus(id: string, status: string): Promise<Game | undefined> {
    const [game] = await db
      .update(games)
      .set({ status })
      .where(eq(games.id, id))
      .returning();
    return game;
  }

  async completeGame(id: string, totalPot: number): Promise<Game | undefined> {
    const [game] = await db
      .update(games)
      .set({ status: "completed", totalPot, completedAt: new Date() })
      .where(eq(games.id, id))
      .returning();
    return game;
  }

  // Game Players
  async getGamePlayers(gameId: string): Promise<GamePlayerWithPlayer[]> {
    const gps = await db
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, gameId));

    const result: GamePlayerWithPlayer[] = [];
    for (const gp of gps) {
      const player = await this.getPlayer(gp.playerId);
      if (player) {
        result.push({ ...gp, player });
      }
    }

    return result;
  }

  async addPlayerToGame(insertGamePlayer: InsertGamePlayer): Promise<GamePlayer> {
    const [gamePlayer] = await db
      .insert(gamePlayers)
      .values({ ...insertGamePlayer, buyInCount: insertGamePlayer.buyInCount || 1 })
      .returning();
    return gamePlayer;
  }

  async updateGamePlayer(id: string, data: Partial<GamePlayer>): Promise<GamePlayer | undefined> {
    const [gamePlayer] = await db
      .update(gamePlayers)
      .set(data)
      .where(eq(gamePlayers.id, id))
      .returning();
    return gamePlayer;
  }

  async removePlayerFromGame(id: string): Promise<void> {
    await db.delete(gamePlayers).where(eq(gamePlayers.id, id));
  }

  // Settlements
  async getAllSettlements(): Promise<SettlementWithPlayers[]> {
    const allSettlements = await db.select().from(settlements);
    const result: SettlementWithPlayers[] = [];

    for (const s of allSettlements) {
      const fromPlayer = await this.getPlayer(s.fromPlayerId);
      const toPlayer = await this.getPlayer(s.toPlayerId);
      if (fromPlayer && toPlayer) {
        result.push({ ...s, fromPlayer, toPlayer });
      }
    }

    return result;
  }

  async getSettlementsByGame(gameId: string): Promise<SettlementWithPlayers[]> {
    const gameSettlements = await db
      .select()
      .from(settlements)
      .where(eq(settlements.gameId, gameId));

    const result: SettlementWithPlayers[] = [];
    for (const s of gameSettlements) {
      const fromPlayer = await this.getPlayer(s.fromPlayerId);
      const toPlayer = await this.getPlayer(s.toPlayerId);
      if (fromPlayer && toPlayer) {
        result.push({ ...s, fromPlayer, toPlayer });
      }
    }

    return result;
  }

  async createSettlement(insertSettlement: InsertSettlement): Promise<Settlement> {
    const [settlement] = await db.insert(settlements).values(insertSettlement).returning();
    return settlement;
  }

  async deleteSettlementsByGame(gameId: string): Promise<void> {
    await db.delete(settlements).where(eq(settlements.gameId, gameId));
  }
}

export const storage = new DatabaseStorage();
