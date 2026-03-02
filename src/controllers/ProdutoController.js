const knex = require("../database");
const { z } = require("zod");

const produtoSchema = z.object({
  categoria_id: z
    .string()
    .uuid("ID da categoria inválido")
    .optional()
    .nullable(),
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(150),
  descricao: z.string().optional().nullable(),
  preco: z.number().min(0, "O preço não pode ser negativo"),
  imagem_url: z
    .string()
    .url("URL de imagem inválida")
    .optional()
    .nullable()
    .or(z.literal("")),
  ativo: z.boolean().optional().default(true),
});

class ProdutoController {
  async create(req, res) {
    try {
      const dadosValidados = produtoSchema.parse(req.body);
      const tenant_id = req.usuario.tenant_id;

      if (dadosValidados.categoria_id) {
        const categoria = await knex("categorias")
          .where({ id: dadosValidados.categoria_id, tenant_id })
          .first();

        if (!categoria) {
          return res.status(404).json({
            erro: "Categoria não encontrada ou não pertence a este estabelecimento.",
          });
        }
      }

      const [novoProduto] = await knex("produtos")
        .insert({
          ...dadosValidados,
          tenant_id,
        })
        .returning("*");

      return res.status(201).json(novoProduto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao criar produto." });
    }
  }

  async index(req, res) {
    try {
      const tenant_id = req.usuario.tenant_id;

      const produtos = await knex("produtos")
        .select("produtos.*", "categorias.nome as categoria_nome")
        .leftJoin("categorias", "produtos.categoria_id", "categorias.id")
        .where("produtos.tenant_id", tenant_id)
        .orderBy("categorias.ordem", "asc")
        .orderBy("produtos.nome", "asc");

      return res.json(produtos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao listar produtos." });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.usuario.tenant_id;
      const dadosValidados = produtoSchema.partial().parse(req.body);

      const produto = await knex("produtos").where({ id, tenant_id }).first();
      if (!produto) {
        return res.status(404).json({
          erro: "Produto não encontrado ou não pertence a este estabelecimento.",
        });
      }

      if (dadosValidados.categoria_id) {
        const categoria = await knex("categorias")
          .where({ id: dadosValidados.categoria_id, tenant_id })
          .first();

        if (!categoria) {
          return res.status(404).json({
            erro: "Categoria não encontrada ou não pertence a este estabelecimento.",
          });
        }
      }

      const [produtoAtualizado] = await knex("produtos")
        .where({ id, tenant_id })
        .update(dadosValidados)
        .returning("*");

      return res.json(produtoAtualizado);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao atualizar produto." });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.usuario.tenant_id;

      const produto = await knex("produtos").where({ id, tenant_id }).first();
      if (!produto) {
        return res.status(404).json({
          erro: "Produto não encontrado ou não pertence a este estabelecimento.",
        });
      }

      await knex("produtos").where({ id, tenant_id }).update({ ativo: false });

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao excluir produto." });
    }
  }
}

module.exports = new ProdutoController();
