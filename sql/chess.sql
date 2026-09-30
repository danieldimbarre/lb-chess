-- lb-chess creates these tables automatically on start. Kept here for manual installs.

CREATE TABLE IF NOT EXISTS chess_players (
  passport INT NOT NULL PRIMARY KEY,
  username VARCHAR(16) NOT NULL,
  rating INT NOT NULL DEFAULT 1200,
  peak INT NOT NULL DEFAULT 1200,
  games INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  draws INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_chess_username (username),
  KEY idx_chess_games (games),
  KEY idx_chess_rating (rating)
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chess_games (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  white INT NOT NULL,
  black INT NOT NULL,
  white_name VARCHAR(16) NOT NULL,
  black_name VARCHAR(16) NOT NULL,
  white_rating INT NOT NULL,
  black_rating INT NOT NULL,
  white_delta INT NOT NULL DEFAULT 0,
  black_delta INT NOT NULL DEFAULT 0,
  result VARCHAR(7) NOT NULL,
  reason VARCHAR(24) NOT NULL,
  time_control VARCHAR(12) NOT NULL,
  moves INT NOT NULL DEFAULT 0,
  pgn TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_chess_white (white),
  KEY idx_chess_black (black)
) DEFAULT CHARSET=utf8mb4;
