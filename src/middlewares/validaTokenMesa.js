const knex = require("../database");

async function validaTokenMesa(req, res, next) {
  try {
    const token = req.headers["x-mesa-token"];

    if (!token) {
      return res
        .status(401)
        .json({ erro: "Acesso negado. Escaneie o QR Code da mesa." });
    }

    const mesa = await knex("mesas").where({ token_atual: token }).first();

    if (!mesa) {
      return res.status(401).json({
        erro: "Token inválido ou expirado. Por favor, escaneie o QR Code novamente.",
      });
    }

    if (mesa.status !== "aberta") {
      return res.status(403).json({
        erro: "Esta mesa não está aberta. Solicite ao garçom para abri-la.",
      });
    }

    const agora = new Date();
    if (mesa.token_expira_em && new Date(mesa.token_expira_em) < agora) {
      return res.status(401).json({
        erro: "O tempo limite da sessão expirou por segurança. Solicite a reabertura da mesa.",
      });
    }

    req.mesaAuth = {
      mesa_id: mesa.id,
      tenant_id: mesa.tenant_id,
      numero: mesa.numero,
    };

    return next();
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ erro: "Erro interno ao validar o acesso da mesa." });
  }
}

module.exports = validaTokenMesa;
