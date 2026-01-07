import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Players table - persistent player records across all games
export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  totalBalance: integer("total_balance").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
});

export const playersRelations = relations(players, ({ many }) => ({
  gamePlayers: many(gamePlayers),
}));

// Games table - individual poker sessions
export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull().defaultNow(),
  defaultBuyIn: integer("default_buy_in").notNull().default(500),
  status: text("status").notNull().default("active"), // 'active' | 'settling' | 'completed'
  totalPot: integer("total_pot").notNull().default(0),
});

export const gamesRelations = relations(games, ({ many }) => ({
  gamePlayers: many(gamePlayers),
  settlements: many(settlements),
}));

// GamePlayers table - players participating in a specific game
export const gamePlayers = pgTable("game_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  playerId: varchar("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  buyInCount: integer("buy_in_count").notNull().default(1),
  finalAmount: integer("final_amount"), // Amount player has at end (can be negative/positive)
  netResult: integer("net_result"), // finalAmount - (buyInCount * defaultBuyIn)
});

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  game: one(games, {
    fields: [gamePlayers.gameId],
    references: [games.id],
  }),
  player: one(players, {
    fields: [gamePlayers.playerId],
    references: [players.id],
  }),
}));

// Settlements table - who owes whom after game ends
export const settlements = pgTable("settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  fromPlayerId: varchar("from_player_id").notNull().references(() => players.id),
  toPlayerId: varchar("to_player_id").notNull().references(() => players.id),
  amount: integer("amount").notNull(),
});

export const settlementsRelations = relations(settlements, ({ one }) => ({
  game: one(games, {
    fields: [settlements.gameId],
    references: [games.id],
  }),
  fromPlayer: one(players, {
    fields: [settlements.fromPlayerId],
    references: [players.id],
  }),
  toPlayer: one(players, {
    fields: [settlements.toPlayerId],
    references: [players.id],
  }),
}));

// Insert schemas
export const insertPlayerSchema = createInsertSchema(players).pick({
  name: true,
});

export const insertGameSchema = createInsertSchema(games).pick({
  defaultBuyIn: true,
});

export const insertGamePlayerSchema = createInsertSchema(gamePlayers).pick({
  gameId: true,
  playerId: true,
  buyInCount: true,
});

export const insertSettlementSchema = createInsertSchema(settlements).pick({
  gameId: true,
  fromPlayerId: true,
  toPlayerId: true,
  amount: true,
});

// Types
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type GamePlayer = typeof gamePlayers.$inferSelect;
export type InsertGamePlayer = z.infer<typeof insertGamePlayerSchema>;

export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;

// Extended types for frontend
export type GamePlayerWithPlayer = GamePlayer & { player: Player };
export type GameWithPlayers = Game & { gamePlayers: GamePlayerWithPlayer[] };
export type SettlementWithPlayers = Settlement & { fromPlayer: Player; toPlayer: Player };
