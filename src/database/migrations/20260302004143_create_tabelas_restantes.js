/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("usuarios", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("estabelecimentos")
      .onDelete("CASCADE");
    table.string("nome", 150).notNullable();
    table.string("email", 150).notNullable();
    table.text("senha_hash").notNullable();
    table
      .enum("tipo", ["admin", "garcom"], {
        useNative: true,
        enumName: "tipo_usuario",
      })
      .notNullable();
    table.boolean("ativo").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.unique(["tenant_id", "email"]);
  });

  await knex.schema.createTable("mesas", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("estabelecimentos")
      .onDelete("CASCADE");
    table.integer("numero").notNullable();
    table
      .enum("status", ["livre", "aberta", "fechada"], {
        useNative: true,
        enumName: "status_mesa",
      })
      .defaultTo("livre");
    table.text("token_atual");
    table.timestamp("token_expira_em");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.unique(["tenant_id", "numero"]);
    table.index("tenant_id", "idx_mesas_tenant");
  });

  await knex.schema.createTable("categorias", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("estabelecimentos")
      .onDelete("CASCADE");
    table.string("nome", 150).notNullable();
    table.integer("ordem").defaultTo(0);
    table.boolean("ativo").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("produtos", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("estabelecimentos")
      .onDelete("CASCADE");
    table
      .uuid("categoria_id")
      .references("id")
      .inTable("categorias")
      .onDelete("SET NULL");
    table.string("nome", 150).notNullable();
    table.text("descricao");
    table.decimal("preco", 10, 2).notNullable();
    table.text("imagem_url");
    table.boolean("ativo").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.index("tenant_id", "idx_produtos_tenant");
  });

  await knex.schema.createTable("adicionais", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("estabelecimentos")
      .onDelete("CASCADE");
    table
      .uuid("produto_id")
      .notNullable()
      .references("id")
      .inTable("produtos")
      .onDelete("CASCADE");
    table.string("nome", 150).notNullable();
    table.decimal("preco", 10, 2).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("clientes", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("estabelecimentos")
      .onDelete("CASCADE");
    table.string("nome", 150).notNullable();
    table.string("telefone", 20).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.unique(["tenant_id", "telefone"]);
    table.index("tenant_id", "idx_clientes_tenant");
  });

  await knex.schema.createTable("enderecos_cliente", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("cliente_id")
      .notNullable()
      .references("id")
      .inTable("clientes")
      .onDelete("CASCADE");
    table.string("apelido", 100);
    table.string("rua", 150).notNullable();
    table.string("numero", 20);
    table.string("bairro", 150);
    table.string("cidade", 150);
    table.text("referencia");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("pedidos", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("estabelecimentos")
      .onDelete("CASCADE");
    table
      .uuid("mesa_id")
      .references("id")
      .inTable("mesas")
      .onDelete("SET NULL");
    table
      .uuid("cliente_id")
      .references("id")
      .inTable("clientes")
      .onDelete("SET NULL");
    table
      .uuid("endereco_entrega_id")
      .references("id")
      .inTable("enderecos_cliente")
      .onDelete("SET NULL");
    table
      .enum("tipo", ["mesa", "delivery", "retirada"], {
        useNative: true,
        enumName: "tipo_pedido",
      })
      .notNullable();
    table
      .enum(
        "status",
        ["pendente", "preparo", "pronto", "entrega", "finalizado", "cancelado"],
        { useNative: true, enumName: "status_pedido" },
      )
      .defaultTo("pendente");
    table.enum("forma_pagamento", ["dinheiro", "pix", "credito", "debito"], {
      useNative: true,
      enumName: "forma_pagamento",
    });
    table.decimal("taxa_delivery", 10, 2).defaultTo(0);
    table.decimal("subtotal", 10, 2).notNullable();
    table.decimal("total", 10, 2).notNullable();
    table.text("observacoes");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.index("tenant_id", "idx_pedidos_tenant");
    table.index("status", "idx_pedidos_status");
  });

  await knex.schema.createTable("pedido_itens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("pedido_id")
      .notNullable()
      .references("id")
      .inTable("pedidos")
      .onDelete("CASCADE");
    table
      .uuid("produto_id")
      .references("id")
      .inTable("produtos")
      .onDelete("SET NULL");
    table.string("nome_produto", 150).notNullable();
    table.decimal("preco_unitario", 10, 2).notNullable();
    table.integer("quantidade").notNullable();
    table.text("observacao");
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("pedido_itens_adicionais", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("pedido_item_id")
      .notNullable()
      .references("id")
      .inTable("pedido_itens")
      .onDelete("CASCADE");
    table
      .uuid("adicional_id")
      .references("id")
      .inTable("adicionais")
      .onDelete("SET NULL");
    table.string("nome_adicional", 150).notNullable();
    table.decimal("preco", 10, 2).notNullable();
  });

  await knex.schema.createTable("movimentacoes_financeiras", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("estabelecimentos")
      .onDelete("CASCADE");
    table
      .uuid("pedido_id")
      .references("id")
      .inTable("pedidos")
      .onDelete("SET NULL");
    table
      .enum("tipo", ["entrada", "saida"], {
        useNative: true,
        enumName: "tipo_movimentacao",
      })
      .notNullable();
    table.text("descricao");
    table.decimal("valor", 10, 2).notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // O rollback deve ser feito na ordem inversa à da criação para não quebrar as chaves estrangeiras
  await knex.schema.dropTableIfExists("movimentacoes_financeiras");
  await knex.schema.dropTableIfExists("pedido_itens_adicionais");
  await knex.schema.dropTableIfExists("pedido_itens");
  await knex.schema.dropTableIfExists("pedidos");
  await knex.schema.dropTableIfExists("enderecos_cliente");
  await knex.schema.dropTableIfExists("clientes");
  await knex.schema.dropTableIfExists("adicionais");
  await knex.schema.dropTableIfExists("produtos");
  await knex.schema.dropTableIfExists("categorias");
  await knex.schema.dropTableIfExists("mesas");
  await knex.schema.dropTableIfExists("usuarios");

  // Limpar os tipos ENUM nativos criados no PostgreSQL
  await knex.raw("DROP TYPE IF EXISTS tipo_movimentacao CASCADE");
  await knex.raw("DROP TYPE IF EXISTS forma_pagamento CASCADE");
  await knex.raw("DROP TYPE IF EXISTS status_pedido CASCADE");
  await knex.raw("DROP TYPE IF EXISTS tipo_pedido CASCADE");
  await knex.raw("DROP TYPE IF EXISTS status_mesa CASCADE");
  await knex.raw("DROP TYPE IF EXISTS tipo_usuario CASCADE");
};
