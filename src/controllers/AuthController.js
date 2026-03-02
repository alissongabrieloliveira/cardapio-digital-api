const knex = require("../database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().email("Formato de e-mail inválido"),
  senha: z.string().min(1, "A senha é obrigatória"),
});

class AuthController {
  async login(req, res) {
    try {
      const { email, senha } = loginSchema.parse(req.body);

      const usuario = await knex("usuarios")
        .where({ email, ativo: true })
        .first();

      if (!usuario) {
        return res.status(401).json({ erro: "Credenciais inválidas." });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
      if (!senhaValida) {
        return res.status(401).json({ erro: "Credenciais inválidas." });
      }

      const payload = {
        id: usuario.id,
        tenant_id: usuario.tenant_id,
        tipo: usuario.tipo,
      };

      const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "15m",
      });

      const refreshSecret =
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
      const refreshToken = jwt.sign(payload, refreshSecret, {
        expiresIn: "7d",
      });

      return res.json({
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
          tenant_id: usuario.tenant_id,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ erro: "Dados inválidos", detalhes: error.errors });
      }
      console.error(error);
      return res.status(500).json({ erro: "Erro interno ao realizar login." });
    }
  }
}

module.exports = new AuthController();
