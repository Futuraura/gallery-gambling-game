# Gallery Gambling - Game Design Document

## Overview

**Gallery Gambling** is a web-based multiplayer party game where players create, bid, and bluff on artwork.
It combines creativity with risk-taking and humor. The game flow revolves around players drawing prompts,
auctioning those drawings, and revealing their hidden values to determine the winner.

This document serves as a comprehensive overview of the game mechanics, flow, and technical requirements.

---

## Core Concept

- Each player is both an **artist** and an **investor**.
- Players draw simple artworks based on prompts.
- The drawings are then auctioned blindly to other players.
- The true "market value" of each artwork is revealed after the bidding.
- The player with the most money at the end wins.

---

## Game Flow

### 1. Setup

- Game supports **3–8 players**.
- Each player starts with a set amount of **money (credits)**, e.g., $3,000.
- Players are given a drawing tool (simple canvas on the frontend).

### 2. Drawing Phase

- Each player receives **two random prompts** (e.g., "sunset", "hamburger", "dinosaur").
- Players select one and must draw it within a time limit (e.g., 60 seconds).
- The drawing is submitted anonymously to the auction pool.

### 3. Auction Phase

- One artwork is displayed at a time.
- Players place bids using their money.
- Bidding is open (ascending auction) OR timed (30 seconds, highest bid wins).
- Special ability: "Force Bid" (players can make another player bid once per game).

### 4. Reveal Phase

- Once sold, the **true value** of the artwork is revealed (hidden number between, say, $500–$5,000).
- The buyer either profits (if value > bid) or loses money (if value < bid).

### 5. Banking / Loan System

- Players can take out a loan mid-game to gain extra money.
- Loans carry **50% interest** and are deducted at the end of the game.

### 6. Game End

- After a set number of rounds (e.g., each player auctions 2 drawings), the game ends.
- Final scores are calculated as:

  ```
  Final Score = Money Remaining - Loan Repayment
  ```

- Player with the **highest score** wins.

---

## Mechanics in Detail

### Drawing

- **Tool**: Simple HTML canvas (color + pen size optional).
- Time-limited to prevent overly detailed art.

### Bidding

- Real-time bids (socket-based) OR turn-based for simpler implementation.
- Starting price: $500 minimum per artwork.
- Each player can see bids in real-time.

### Value Assignment

- Hidden value is pre-generated when the artwork is submitted.
- Value range configurable (e.g., $500–$5,000).

### Loans

- Player requests a loan during their turn or mid-auction.
- Loan automatically increases player’s balance by $2,000.
- At the end, the player must repay $3,000.

### Special Actions

- **Force Bid ("Screw")**: Once per player, they can force another player to bid on the current artwork.
- Optional: add **Sabotage Cards** like "Block Bid" or "Steal Bid" to increase chaos.

---

## Technical Requirements

### Frontend

- **Framework**: React (recommended) or plain JS/HTML/CSS.
- Features:
  - Canvas for drawing.
  - Auction interface (real-time bidding updates).
  - Scoreboard UI.
  - Timer display for rounds.

### Backend

- **Framework**: Node.js + Express.
- **Database**: MongoDB or MySQL for user/game data.
- **Real-time**: Socket.IO for bidding + player updates.

### Entities / Data Models

```yaml
Player:
  id: string
  name: string
  balance: int
  loans: int
  drawings: [DrawingID]
  force_bid_used: bool

Drawing:
  id: string
  artist_id: string
  prompt: string
  value: int
  image_data: base64

Auction:
  drawing_id: string
  current_bid: int
  highest_bidder: string
  ended: bool
```

---

## Stretch Goals (Optional Features)

- **Spectator Mode**: Allow extra players to watch auctions.
- **AI Filler Players**: If fewer than 3 humans join, AI players generate funny doodles & bids.
- **Custom Prompts**: Players can submit prompt ideas before game starts.
- **Leaderboards**: Track best players over time.

---

## Example Round (Step-by-Step)

1. All players draw their prompt within 60 seconds.
2. Drawing #1 enters auction.
   - Player A bids $1,500, Player B bids $2,000 → B wins.
   - Hidden value revealed: $3,200. Player B profits.
3. Drawing #2 enters auction.
   - Player C is forced to bid $1,000 by Player D.
   - Hidden value revealed: $700. Player C loses money.
4. Next rounds continue until all drawings are auctioned.
5. Final balances calculated → Winner declared.

---

## Key Selling Points

- **Creativity + Luck**: Combines skill in drawing with randomness in value.
- **Funny + Social**: Bad drawings often sell high, making it entertaining.
- **Replayable**: Random prompts and values keep each session unique.

---

## Scope Control for 7 Weeks

- **Weeks 1–2**: Requirement gathering, UI mockups, ER models.
- **Weeks 3–4**: Implement drawing + saving system, basic backend setup.
- **Weeks 5–6**: Implement auction system, bidding logic, and scoring.
- **Week 7**: Polish UI, testing, documentation, final presentation.

---

## Conclusion

**Gallery Gambling** is a fun, chaotic, yet achievable web project that demonstrates
both frontend (drawing, auction UI) and backend (real-time bidding, game logic) skills.
Its scope is manageable within 7 weeks if implemented step by step,
and it’s guaranteed to impress with its originality and entertainment factor.
