const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ erro: "Token de autenticação não fornecido." });
  }

  const partes = authHeader.split(" ");

  if (partes.length !== 2 || partes[0] !== "Bearer") {
    return res.status(401).json({ erro: "Token mal formatado." });
  }

  const token = partes[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = {
      id: decoded.id,
      tenant_id: decoded.tenant_id,
      tipo: decoded.tipo,
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ erro: "Token expirado. Por favor, faça login novamente." });
    }

    return res.status(401).json({ erro: "Token inválido." });
  }
}

module.exports = authMiddleware;
