const app = require("./app");

// 🔒 REQUIRED FOR RENDER
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`TallyInsight API running on port ${PORT}`);
});
