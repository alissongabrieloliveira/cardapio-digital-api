const knex = require("../database");
const { z } = require("zod");

const movimentacaoSchema = z.object({
  tipo: z.enum(["entrada", "saida"]),
  descricao: z.string().min(2, "A descrição é obrigatória").max(255),
  valor: z.number().positive("O valor deve ser maior que zero"),
});

class MovimentacaoFinanceiraController {
  async create(req, res) {
    try {
      const dadosValidados = movimentacaoSchema.parse(req.body);
      const tenant_id = req.usuario.tenant_id;

      const [novaMovimentacao] = await knex("movimentacoes_financeiras")
        .insert({
          ...dadosValidados,
          tenant_id,
        })
        .returning("*");

      return res.status(201).json(novaMovimentacao);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao registrar movimentação financeira." });
    }
  }

  async index(req, res) {
    try {
      const tenant_id = req.usuario.tenant_id;
      const { data_inicio, data_fim } = req.query;

      let query = knex("movimentacoes_financeiras")
        .where({ tenant_id })
        .orderBy("created_at", "desc");

      if (data_inicio) {
        query = query.where("created_at", ">=", `${data_inicio} 00:00:00`);
      }
      if (data_fim) {
        query = query.where("created_at", "<=", `${data_fim} 23:59:59`);
      }

      const movimentacoes = await query;

      const resumo = movimentacoes.reduce(
        (acc, mov) => {
          const valor = Number(mov.valor);
          if (mov.tipo === "entrada") {
            acc.total_entradas += valor;
            acc.saldo_final += valor;
          } else {
            acc.total_saidas += valor;
            acc.saldo_final -= valor;
          }
          return acc;
        },
        { total_entradas: 0, total_saidas: 0, saldo_final: 0 },
      );

      return res.json({
        resumo,
        movimentacoes,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ erro: "Erro interno ao buscar o extrato financeiro." });
    }
  }
}

module.exports = new MovimentacaoFinanceiraController();
