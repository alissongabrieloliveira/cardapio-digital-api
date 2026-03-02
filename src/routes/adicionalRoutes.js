const { Router } = require("express");
const AdicionalController = require("../controllers/AdicionalController");
const authMiddleware = require("../middlewares/authMiddleware");

const rotas = Router();

rotas.use(authMiddleware);

rotas.post("/", AdicionalController.create);
rotas.get("/", AdicionalController.index);
rotas.put("/:id", AdicionalController.update);
rotas.delete("/:id", AdicionalController.delete);

module.exports = rotas;
