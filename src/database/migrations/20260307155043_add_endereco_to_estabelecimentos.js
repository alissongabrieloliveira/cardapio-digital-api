/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("estabelecimentos", (table) => {
    table.string("endereco_rua");
    table.string("endereco_numero");
    table.string("endereco_bairro");
    table.string("endereco_cidade");
    table.string("endereco_uf", 2);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("estabelecimentos", (table) => {
    table.dropColumn("endereco_rua");
    table.dropColumn("endereco_numero");
    table.dropColumn("endereco_bairro");
    table.dropColumn("endereco_cidade");
    table.dropColumn("endereco_uf");
  });
};
