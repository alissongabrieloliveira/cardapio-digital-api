require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { erro: "Muitas requisições deste IP, tente novamente mais tarde." },
});
app.use(limiter);

app.get("/", (req, res) => {
  return res.json({
    status: "sucesso",
    mensagem: "API do Click Menu rodando com segurança!",
    timestamp: new Date(),
  });
});

app.use((req, res, next) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Proteção Helmet e Rate Limiting ativados.`);
});
