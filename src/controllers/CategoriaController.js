const knex = require("../database");
const { z } = require("zod");

const categoriaSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(150),
  ordem: z
    .number()
    .int("A ordem deve ser um número inteiro")
    .optional()
    .default(0),
  ativo: z.boolean().optional().default(true),
});

class CategoriaController {
  async create(req, res) {
    try {
      const dadosValidados = categoriaSchema.parse(req.body);
      const tenant_id = req.usuario.tenant_id;
      const [novaCategoria] = await knex("categorias")
        .insert({
          ...dadosValidados,
          tenant_id,
        })
        .returning("*");

      return res.status(201).json(novaCategoria);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao criar categoria." });
    }
  }

  async index(req, res) {
    try {
      const tenant_id = req.usuario.tenant_id;

      const categorias = await knex("categorias")
        .where({ tenant_id })
        .orderBy("ordem", "asc")
        .orderBy("created_at", "desc");

      return res.json(categorias);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao listar categorias." });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.usuario.tenant_id;
      const dadosValidados = categoriaSchema.partial().parse(req.body);

      const categoria = await knex("categorias")
        .where({ id, tenant_id })
        .first();

      if (!categoria) {
        return res.status(404).json({
          erro: "Categoria não encontrada ou não pertence a este estabelecimento.",
        });
      }

      const [categoriaAtualizada] = await knex("categorias")
        .where({ id, tenant_id })
        .update(dadosValidados)
        .returning("*");

      return res.json(categoriaAtualizada);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao atualizar categoria." });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.usuario.tenant_id;

      const categoria = await knex("categorias")
        .where({ id, tenant_id })
        .first();

      if (!categoria) {
        return res.status(404).json({
          erro: "Categoria não encontrada ou não pertence a este estabelecimento.",
        });
      }

      await knex("categorias")
        .where({ id, tenant_id })
        .update({ ativo: false });

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao excluir categoria." });
    }
  }
}

module.exports = new CategoriaController();
