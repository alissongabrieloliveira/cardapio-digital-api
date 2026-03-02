const knex = require("../database");
const { z } = require("zod");

const adicionalSchema = z.object({
  produto_id: z.string().uuid("ID do produto inválido"),
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(150),
  preco: z.number().min(0, "O preço não pode ser negativo"),
});

class AdicionalController {
  async create(req, res) {
    try {
      const dadosValidados = adicionalSchema.parse(req.body);
      const tenant_id = req.usuario.tenant_id;

      const produto = await knex("produtos")
        .where({ id: dadosValidados.produto_id, tenant_id })
        .first();

      if (!produto) {
        return res.status(404).json({
          erro: "Produto não encontrado ou não pertence a este estabelecimento.",
        });
      }

      const [novoAdicional] = await knex("adicionais")
        .insert({
          ...dadosValidados,
          tenant_id,
        })
        .returning("*");

      return res.status(201).json(novoAdicional);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao criar adicional." });
    }
  }

  async index(req, res) {
    try {
      const tenant_id = req.usuario.tenant_id;
      const { produto_id } = req.query;

      let query = knex("adicionais")
        .select("adicionais.*", "produtos.nome as produto_nome")
        .join("produtos", "adicionais.produto_id", "produtos.id")
        .where("adicionais.tenant_id", tenant_id)
        .orderBy("produtos.nome", "asc")
        .orderBy("adicionais.nome", "asc");

      if (produto_id) {
        query = query.where("adicionais.produto_id", produto_id);
      }

      const adicionais = await query;

      return res.json(adicionais);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao listar adicionais." });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.usuario.tenant_id;
      const dadosValidados = adicionalSchema.partial().parse(req.body);

      const adicional = await knex("adicionais")
        .where({ id, tenant_id })
        .first();
      if (!adicional) {
        return res.status(404).json({
          erro: "Adicional não encontrado ou não pertence a este estabelecimento.",
        });
      }

      if (dadosValidados.produto_id) {
        const produto = await knex("produtos")
          .where({ id: dadosValidados.produto_id, tenant_id })
          .first();

        if (!produto) {
          return res
            .status(404)
            .json({ erro: "O novo produto vinculado não foi encontrado." });
        }
      }

      const [adicionalAtualizado] = await knex("adicionais")
        .where({ id, tenant_id })
        .update(dadosValidados)
        .returning("*");

      return res.json(adicionalAtualizado);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao atualizar adicional." });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.usuario.tenant_id;

      const deletados = await knex("adicionais").where({ id, tenant_id }).del();

      if (deletados === 0) {
        return res.status(404).json({ erro: "Adicional não encontrado." });
      }

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao excluir adicional." });
    }
  }
}

module.exports = new AdicionalController();
