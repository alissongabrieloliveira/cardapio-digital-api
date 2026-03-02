const knex = require("knex");
const knexfile = require("../../knexfile");

// Inicializa a conexão usando as configurações de desenvolvimento
const connection = knex(knexfile.development);

module.exports = connection;
