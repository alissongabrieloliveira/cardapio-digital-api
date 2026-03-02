const { Router } = require("express");
const UsuarioController = require("../controllers/UsuarioController");
const authMiddleware = require("../middlewares/authMiddleware");

const rotas = Router();

rotas.post("/", UsuarioController.create);

rotas.get("/perfil", authMiddleware, (req, res) => {
  return res.json({
    mensagem: "Acesso autorizado!",
    dadosLogados: req.usuario,
  });
});

module.exports = rotas;
