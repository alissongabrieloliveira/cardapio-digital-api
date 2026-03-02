const knex = require("../database");
const { z } = require("zod");

const estabelecimentoSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").max(150),
  slug: z
    .string()
    .min(3)
    .max(150)
    .regex(
      /^[a-z0-9-]+$/,
      "O slug deve conter apenas letras minúsculas, números e hifens",
    ),
  slogan: z.string().max(255).optional(),
  logo_url: z.string().url("URL da logo inválida").optional().or(z.literal("")),
  banner_url: z
    .string()
    .url("URL do banner inválida")
    .optional()
    .or(z.literal("")),
  horario_funcionamento: z.string().optional(),
  endereco: z.string().optional(),
  taxa_delivery_fixa: z
    .number()
    .min(0, "A taxa não pode ser negativa")
    .optional(),
});

class EstabelecimentoController {
  async create(req, res) {
    try {
      const dadosValidados = estabelecimentoSchema.parse(req.body);

      const estabelecimentoExistente = await knex("estabelecimentos")
        .where("slug", dadosValidados.slug)
        .first();

      if (estabelecimentoExistente) {
        return res.status(400).json({
          erro: "Este slug já está em uso por outro estabelecimento.",
        });
      }

      const [novoEstabelecimento] = await knex("estabelecimentos")
        .insert(dadosValidados)
        .returning("*");

      return res.status(201).json(novoEstabelecimento);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao criar estabelecimento." });
    }
  }

  async index(req, res) {
    try {
      const estabelecimentos = await knex("estabelecimentos").orderBy(
        "created_at",
        "desc",
      );
      return res.json(estabelecimentos);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao buscar estabelecimentos." });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const estabelecimento = await knex("estabelecimentos")
        .where({ id })
        .first();

      if (!estabelecimento) {
        return res
          .status(404)
          .json({ erro: "Estabelecimento não encontrado." });
      }

      return res.json(estabelecimento);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao buscar estabelecimento." });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const dadosValidados = estabelecimentoSchema.partial().parse(req.body);

      const estabelecimento = await knex("estabelecimentos")
        .where({ id })
        .first();
      if (!estabelecimento) {
        return res
          .status(404)
          .json({ erro: "Estabelecimento não encontrado." });
      }

      if (dadosValidados.slug && dadosValidados.slug !== estabelecimento.slug) {
        const slugEmUso = await knex("estabelecimentos")
          .where("slug", dadosValidados.slug)
          .first();
        if (slugEmUso) {
          return res.status(400).json({ erro: "Este slug já está em uso." });
        }
      }

      dadosValidados.updated_at = knex.fn.now();

      const [estabelecimentoAtualizado] = await knex("estabelecimentos")
        .where({ id })
        .update(dadosValidados)
        .returning("*");

      return res.json(estabelecimentoAtualizado);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao atualizar estabelecimento." });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      const estabelecimento = await knex("estabelecimentos")
        .where({ id })
        .first();
      if (!estabelecimento) {
        return res
          .status(404)
          .json({ erro: "Estabelecimento não encontrado." });
      }

      await knex("estabelecimentos")
        .where({ id })
        .update({ ativo: false, updated_at: knex.fn.now() });

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao excluir estabelecimento." });
    }
  }
}

module.exports = new EstabelecimentoController();
