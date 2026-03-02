const { Router } = require("express");
const estabelecimentoRoutes = require("./estabelecimentoRoutes");
const usuarioRoutes = require("./usuarioRoutes");
const authRoutes = require("./authRoutes");
const categoriaRoutes = require("./categoriaRoutes");
const produtoRoutes = require("./produtoRoutes");
const adicionalRoutes = require("./adicionalRoutes");
const mesaRoutes = require("./mesaRoutes");
const clienteRoutes = require("./clienteRoutes");
const pedidoRoutes = require("./pedidoRoutes");

const rotas = Router();

rotas.use("/estabelecimentos", estabelecimentoRoutes);
rotas.use("/usuarios", usuarioRoutes);
rotas.use("/auth", authRoutes);
rotas.use("/categorias", categoriaRoutes);
rotas.use("/produtos", produtoRoutes);
rotas.use("/adicionais", adicionalRoutes);
rotas.use("/mesas", mesaRoutes);
rotas.use("/clientes", clienteRoutes);
rotas.use("/pedidos", pedidoRoutes);

module.exports = rotas;
