import { useEffect, useState } from "react";
import "./RewardsPoints.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

const FALLBACK_REWARDS = [
  {
    id: 1,
    title: "Free coffee",
    points: 50,
    business: "Main Street Cafe",
    description: "Enjoy a complimentary coffee at Main Street Cafe",
    category: "food",
  },
  {
    id: 2,
    title: "10% off groceries",
    points: 100,
    business: "Neighborhood Market",
    description: "Save 10% on your next grocery purchase",
    category: "shopping",
  },
  {
    id: 3,
    title: "Free car wash",
    points: 150,
    business: "Sparkle Auto Wash",
    description: "Get your car sparkling clean",
    category: "services",
  },
  {
    id: 4,
    title: "Movie ticket",
    points: 200,
    business: "Downtown Cinema",
    description: "One free admission to any regular screening",
    category: "entertainment",
  },
  {
    id: 5,
    title: "Free haircut",
    points: 250,
    business: "Community Barber Shop",
    description: "One complimentary haircut service",
    category: "services",
  },
  {
    id: 6,
    title: "$25 restaurant voucher",
    points: 300,
    business: "Local Bistro",
    description: "$25 off your meal at Local Bistro",
    category: "food",
  },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "food", label: "Food & drink" },
  { id: "shopping", label: "Shopping" },
  { id: "services", label: "Services" },
  { id: "entertainment", label: "Fun" },
];

function getRank(points) {
  if (points >= 500) return "Community Champion";
  if (points >= 250) return "Trusted Helper";
  if (points >= 100) return "Neighborhood Helper";
  return "Newcomer";
}

export default function RewardsPoints() {
  const [filter, setFilter] = useState("all");
  const [userData, setUserData] = useState(null);
  const [rewards, setRewards] = useState(FALLBACK_REWARDS);
  const [loading, setLoading] = useState(true);

  const userId = localStorage.getItem("user_id");
  const storedName = localStorage.getItem("name") || "Neighbor";

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        // Fetch user stats
        if (userId) {
          const statsRes = await fetch(`${API_BASE_URL}/users/${userId}/stats`);
          if (statsRes.ok && !ignore) {
            const stats = await statsRes.json();
            setUserData(stats);
          }
        }

        // Fetch rewards
        const rewardsRes = await fetch(`${API_BASE_URL}/rewards`);
        if (rewardsRes.ok && !ignore) {
          const data = await rewardsRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setRewards(
              data.map((r) => ({
                id: r.id,
                title: r.title,
                points: r.points_needed,
                business: r.business_name,
                description: r.description,
                category: "services",
              })),
            );
          }
        }
      } catch {
        // Keep fallbacks
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [userId]);

  const points = userData?.points ?? 0;
  const completedChores = userData?.completed_chores ?? 0;
  const rank = getRank(points);

  const nextReward = rewards.length
    ? (rewards.find((r) => r.points > points) ?? rewards[rewards.length - 1])
    : null;
  const progress = nextReward
    ? Math.min(100, (points / nextReward.points) * 100)
    : 0;
  const pointsToGo = nextReward ? Math.max(0, nextReward.points - points) : 0;

  const filtered =
    filter === "all" ? rewards : rewards.filter((r) => r.category === filter);

  if (loading && !userData) {
    return (
      <div className="rewards-page">
        <header className="page-header">
          <h1>Rewards &amp; points</h1>
        </header>
        <section className="placeholder-section">
          <p className="section-label">Loading your points...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="rewards-page">
      <header className="page-header">
        <p className="greeting">Welcome back, {storedName}</p>
        <h1>Rewards &amp; points</h1>
        <p>Earn points helping neighbors. Redeem at local businesses.</p>
      </header>

      <section className="points-hero" aria-label="Points balance">
        <div className="points-hero-bg" />
        <div className="points-hero-content">
          <div className="points-top">
            <div>
              <span className="points-label">Your balance</span>
              <div className="points-value">
                {points}
                <span className="points-unit">pts</span>
              </div>
            </div>
            <div className="rank-badge">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.8 5.7 21l2.3-7-6-4.6h7.6L12 2z" />
              </svg>
              {rank}
            </div>
          </div>

          {nextReward && (
            <div className="progress-block">
              <div className="progress-header">
                <span>
                  {pointsToGo > 0
                    ? `${pointsToGo} pts to ${nextReward.title}`
                    : "Ready to redeem!"}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="progress-next">
                Next up: <strong>{nextReward.title}</strong> at{" "}
                {nextReward.business}
              </p>
            </div>
          )}

          <div className="stats-row">
            <div className="stat">
              <span className="stat-value">{points}</span>
              <span className="stat-label">Current pts</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">{completedChores}</span>
              <span className="stat-label">Chores done</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">{rank}</span>
              <span className="stat-label">Rank</span>
            </div>
          </div>
        </div>
      </section>

      <section className="catalog-section">
        <div className="section-header">
          <span className="section-label">Local rewards</span>
        </div>

        <div className="filter-row">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`chip ${filter === f.id ? "selected" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="rewards-grid">
          {filtered.map((reward) => {
            const canRedeem = points >= reward.points;
            return (
              <article key={reward.id} className="reward-card">
                <div className="reward-card-top">
                  <span className="reward-points-tag">{reward.points} pts</span>
                </div>
                <div className="reward-card-body">
                  <h3>{reward.title}</h3>
                  <p className="reward-business">{reward.business}</p>
                  <p className="reward-desc">{reward.description}</p>
                  <button
                    type="button"
                    className={`redeem-btn ${canRedeem ? "ready" : "locked"}`}
                    disabled={!canRedeem}
                  >
                    {canRedeem
                      ? "Redeem"
                      : `Need ${reward.points - points} more pts`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="partner-banner">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path d="M9 22V12h6v10" />
        </svg>
        <p>Supporting local businesses in your neighborhood</p>
      </div>
    </div>
  );
}
