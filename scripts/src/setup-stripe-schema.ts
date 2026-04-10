import { runMigrations } from "stripe-replit-sync";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  console.log("Running Stripe schema migrations...");
  await runMigrations({
    connectionString,
    schema: "stripe",
  });
  console.log("Stripe schema migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
