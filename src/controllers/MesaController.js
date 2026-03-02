const knex = require("../database");
const { z } = require("zod");
const crypto = require("crypto");

const mesaSchema = z.object({
  numero: z.number().int().positive("O número da mesa deve ser positivo"),
});

class MesaController {
  async create(req, res) {
    try {
      const { numero } = mesaSchema.parse(req.body);
      const tenant_id = req.usuario.tenant_id;

      const mesaExistente = await knex("mesas")
        .where({ numero, tenant_id })
        .first();

      if (mesaExistente) {
        return res
          .status(400)
          .json({ erro: "Já existe uma mesa com este número." });
      }

      const [novaMesa] = await knex("mesas")
        .insert({ numero, tenant_id })
        .returning("*");

      return res.status(201).json(novaMesa);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao criar mesa." });
    }
  }

  async index(req, res) {
    try {
      const tenant_id = req.usuario.tenant_id;

      const mesas = await knex("mesas")
        .where({ tenant_id })
        .orderBy("numero", "asc");

      return res.json(mesas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao listar mesas." });
    }
  }

  async abrirMesa(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.usuario.tenant_id;

      const mesa = await knex("mesas").where({ id, tenant_id }).first();

      if (!mesa) {
        return res.status(404).json({ erro: "Mesa não encontrada." });
      }

      if (mesa.status === "aberta") {
        return res.status(400).json({ erro: "A mesa já está aberta." });
      }

      const tokenGerado = crypto.randomBytes(16).toString("hex");

      const dataExpiracao = new Date();
      dataExpiracao.setHours(dataExpiracao.getHours() + 12);

      const [mesaAberta] = await knex("mesas")
        .where({ id, tenant_id })
        .update({
          status: "aberta",
          token_atual: tokenGerado,
          token_expira_em: dataExpiracao,
        })
        .returning("*");

      return res.json({
        mensagem: "Mesa aberta com sucesso. QR Code gerado.",
        mesa: mesaAberta,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao abrir a mesa." });
    }
  }

  async fecharMesa(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.usuario.tenant_id;

      const mesa = await knex("mesas").where({ id, tenant_id }).first();

      if (!mesa) {
        return res.status(404).json({ erro: "Mesa não encontrada." });
      }

      const [mesaFechada] = await knex("mesas")
        .where({ id, tenant_id })
        .update({
          status: "livre",
          token_atual: null,
          token_expira_em: null,
        })
        .returning("*");

      return res.json({
        mensagem: "Mesa fechada com sucesso. Acesso via QR Code invalidado.",
        mesa: mesaFechada,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao fechar a mesa." });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const tenant_id = req.usuario.tenant_id;

      const mesa = await knex("mesas").where({ id, tenant_id }).first();

      if (!mesa) {
        return res.status(404).json({ erro: "Mesa não encontrada." });
      }

      if (mesa.status === "aberta") {
        return res
          .status(400)
          .json({ erro: "Não é possível excluir uma mesa que está aberta." });
      }

      await knex("mesas").where({ id, tenant_id }).del();

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao excluir mesa." });
    }
  }
}

module.exports = new MesaController();
