-- lb-chess creates these tables automatically on start. Kept here for manual installs.

CREATE TABLE IF NOT EXISTS chess_players (
  passport INT NOT NULL PRIMARY KEY,
  username VARCHAR(16) NOT NULL,
  games INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  draws INT NOT NULL DEFAULT 0,
  winrate DECIMAL(7,6) AS (IF(games > 0, wins / games, 0)) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_chess_username (username),
  KEY idx_chess_games_wins (games, wins),
  KEY idx_chess_wins_games (wins, games),
  KEY idx_chess_winrate_games (winrate, games)
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chess_games (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  white INT NOT NULL,
  black INT NOT NULL,
  white_name VARCHAR(16) NOT NULL,
  black_name VARCHAR(16) NOT NULL,
  result VARCHAR(7) NOT NULL,
  reason VARCHAR(24) NOT NULL,
  time_control VARCHAR(12) NOT NULL,
  moves INT NOT NULL DEFAULT 0,
  pgn TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_chess_white_id (white, id),
  KEY idx_chess_black_id (black, id),
  KEY idx_chess_created (created_at)
) DEFAULT CHARSET=utf8mb4;

