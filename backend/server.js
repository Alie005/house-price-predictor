
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool, initDb } from "./db.js";


const app = express();

app.use(cors());
app.use(express.json());

// ---------- Route 1: Health check ----------
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

// ---------- Route 2: Make a prediction ----------
app.post("/api/predict", async (req, res) => {
    try {
        // 1. Read and convert the input
        const size = Number(req.body.size_sqm);
        const beds = Number(req.body.bedrooms);
        const age = Number(req.body.age_years);

        // 2. Validate the input
        if (
            !(size > 0) ||
            !Number.isInteger(beds) ||
            beds < 1 ||
            !(age >= 0)
        ) {
            return res.status(400).json({
                error: "Please enter: size > 0, bedrooms (whole number >= 1), age >= 0."
            });
        }

        // 3. Ask the Python ML service for a prediction
        const mlResponse = await fetch(
            `${process.env.ML_SERVICE_URL}/predict`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    size_sqm: size,
                    bedrooms: beds,
                    age_years: age
                })
            }
        );

        if (!mlResponse.ok) {
            throw new Error(
                `ML service responded with status ${mlResponse.status}`
            );
        }

        const { predicted_price_k } = await mlResponse.json();

        // 4. Save the prediction in PostgreSQL
        const result = await pool.query(
            `INSERT INTO predictions
             (size_sqm, bedrooms, age_years, predicted_price_k)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [size, beds, age, predicted_price_k]
        );

        // 5. Return the saved record
        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error("Predict error:", err);

        res.status(500).json({
            error: "Something went wrong. Is the ML service running?"
        });
    }
});

// ---------- Route 3: Recent predictions ----------
app.get("/api/predictions", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM predictions ORDER BY created_at DESC LIMIT 10"
        );

        res.json(result.rows);

    } catch (err) {
        console.error("History error:", err);

        res.status(500).json({
            error: "Could not load history."
        });
    }
});

// ---------- Start the server ----------
const PORT = process.env.PORT || 4000;

initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(
                `Backend running on http://localhost:${PORT}`
            );
        });
    })
    .catch((err) => {
        console.error(
            "Could not connect to the database:",
            err.message
        );

        process.exit(1);
    });
