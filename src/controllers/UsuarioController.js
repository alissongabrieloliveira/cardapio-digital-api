const knex = require("../database");
const bcrypt = require("bcryptjs");
const { z } = require("zod");

const usuarioSchema = z.object({
  tenant_id: z.string().uuid("ID do estabelecimento inválido"),
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").max(150),
  email: z.string().email("Formato de e-mail inválido"),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  tipo: z.enum(["admin", "garcom"]).default("admin"),
});

class UsuarioController {
  async create(req, res) {
    try {
      const dadosValidados = usuarioSchema.parse(req.body);

      const estabelecimento = await knex("estabelecimentos")
        .where({ id: dadosValidados.tenant_id })
        .first();
      if (!estabelecimento) {
        return res
          .status(404)
          .json({ erro: "Estabelecimento não encontrado." });
      }

      const usuarioExistente = await knex("usuarios")
        .where({
          tenant_id: dadosValidados.tenant_id,
          email: dadosValidados.email,
        })
        .first();

      if (usuarioExistente) {
        return res
          .status(400)
          .json({ erro: "E-mail já cadastrado para este estabelecimento." });
      }

      const salt = await bcrypt.genSalt(10);
      const senha_hash = await bcrypt.hash(dadosValidados.senha, salt);

      const { senha, ...dadosInsercao } = dadosValidados;

      const [novoUsuario] = await knex("usuarios")
        .insert({
          ...dadosInsercao,
          senha_hash,
        })
        .returning([
          "id",
          "tenant_id",
          "nome",
          "email",
          "tipo",
          "ativo",
          "created_at",
        ]);

      return res.status(201).json(novoUsuario);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao criar usuário." });
    }
  }
}

module.exports = new UsuarioController();
