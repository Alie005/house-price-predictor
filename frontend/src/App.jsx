
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App() {
  const [form, setForm] = useState({
    size_sqm: 120,
    bedrooms: 3,
    age_years: 10
  });

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  // Load prediction history safely.
  async function loadHistory() {
    try {
      const res = await fetch(`${API_URL}/api/predictions`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not load history.");
      }

      if (!Array.isArray(data)) {
        throw new Error("Unexpected history response.");
      }

      setHistory(data);
      setHistoryError("");
    } catch (err) {
      console.error("History error:", err);
      setHistory([]);
      setHistoryError(
        "Prediction history is temporarily unavailable. Check your database connection."
      );
    }
  }

  // Load history when the page first opens.
  useEffect(() => {
    loadHistory();
  }, []);

  // Update form values.
  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  // Submit a prediction request.
  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          size_sqm: Number(form.size_sqm),
          bedrooms: Number(form.bedrooms),
          age_years: Number(form.age_years)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Prediction request failed.");
      }

      if (typeof data.predicted_price_k !== "number") {
        throw new Error("The server returned an invalid prediction.");
      }

      setResult(data);

      // Refresh history without losing the successful prediction.
      await loadHistory();

    } catch (err) {
      console.error("Prediction error:", err);

      setError(
        err.message || "Could not complete prediction. Check your servers."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>🏠 House Price Predictor</h1>

      <p className="subtitle">
        Enter a house's details and let machine learning estimate its price.
      </p>

      <form onSubmit={handleSubmit} className="card">
        <label>
          Size (square meters)
          <input
            type="number"
            name="size_sqm"
            value={form.size_sqm}
            onChange={handleChange}
            min="1"
            required
          />
        </label>

        <label>
          Bedrooms
          <input
            type="number"
            name="bedrooms"
            value={form.bedrooms}
            onChange={handleChange}
            min="1"
            step="1"
            required
          />
        </label>

        <label>
          Age (years)
          <input
            type="number"
            name="age_years"
            value={form.age_years}
            onChange={handleChange}
            min="0"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Predicting..." : "Predict price"}
        </button>
      </form>

      {error && (
        <p className="error">
          ⚠️ {error}
        </p>
      )}

      {result && (
        <div className="card result">
          <p>Estimated price</p>
          <strong>
            ${result.predicted_price_k.toFixed(1)}k
          </strong>
        </div>
      )}

      <h2>Recent predictions</h2>

      {historyError && (
        <p className="error">
          ⚠️ {historyError}
        </p>
      )}

      {history.length === 0 ? (
        <p className="subtitle">
          {historyError
            ? "History could not be loaded."
            : "No predictions yet. Make your first one!"}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Size</th>
              <th>Beds</th>
              <th>Age</th>
              <th>Price</th>
              <th>When</th>
            </tr>
          </thead>

          <tbody>
            {history.map((row) => (
              <tr key={row.id}>
                <td>{row.size_sqm} m²</td>
                <td>{row.bedrooms}</td>
                <td>{row.age_years} yrs</td>
                <td>${Number(row.predicted_price_k).toFixed(1)}k</td>
                <td>
                  {new Date(row.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
