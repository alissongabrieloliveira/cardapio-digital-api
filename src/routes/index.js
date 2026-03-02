const { Router } = require("express");
const estabelecimentoRoutes = require("./estabelecimentoRoutes");
const usuarioRoutes = require("./usuarioRoutes");
const authRoutes = require("./authRoutes");
const categoriaRoutes = require("./categoriaRoutes");

const rotas = Router();

rotas.use("/estabelecimentos", estabelecimentoRoutes);
rotas.use("/usuarios", usuarioRoutes);
rotas.use("/auth", authRoutes);
rotas.use("/categorias", categoriaRoutes);

module.exports = rotas;
