/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("estabelecimentos", (table) => {
    // Usando gen_random_uuid() nativo do PostgreSQL
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));

    table.string("nome", 150).notNullable();
    table.string("slug", 150).notNullable().unique();
    table.string("slogan", 255);
    table.text("logo_url");
    table.text("banner_url");
    table.text("horario_funcionamento");
    table.text("endereco");

    // NUMERIC(10,2)
    table.decimal("taxa_delivery_fixa", 10, 2).defaultTo(0);

    table.boolean("ativo").defaultTo(true);

    // Timestamps
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  // Método down serve para desfazer a migration em caso de rollback
  return knex.schema.dropTable("estabelecimentos");
};
