const app = require("./app");

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TallyInsight API running on port ${PORT}`);
});
