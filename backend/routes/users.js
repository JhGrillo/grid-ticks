import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Endpoint de diagnóstico para checar variáveis de ambiente e conexão
router.get('/self-test', async (req, res) => {
  const jwtOk = !!process.env.JWT_SECRET;
  const mongoOk = !!process.env.MONGO_URI;
  let mongoStatus = 'desconhecido';
  try {
    const mongoose = (await import('mongoose')).default;
    mongoStatus = mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado';
  } catch (e) {
    mongoStatus = 'erro';
  }
  res.json({
    JWT_SECRET: jwtOk ? 'OK' : 'FALTA',
    MONGO_URI: mongoOk ? 'OK' : 'FALTA',
    mongoStatus
  });
});


// Registrar usuário (apenas para testes, bloqueado em produção)
router.post('/register', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Registro de usuário desabilitado em produção.' });
  }
  try {
    let { nome, email, senha, role, area, carteira } = req.body;
    // Garante que area seja sempre array
    if (area && !Array.isArray(area)) {
      area = [area];
    }
    const hash = await bcrypt.hash(senha, 10);
    const user = new User({ nome, email, senha: hash, role, area, carteira });
    await user.save();
    res.status(201).json({ message: 'Usuário criado com sucesso!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login com JWT
router.post('/login', async (req, res) => {
  console.log('[LOGIN] JWT_SECRET em runtime:', process.env.JWT_SECRET);
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Configuração de token indisponível.' });
    }
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({
      token,
      user: {
        nome: user.nome,
        email: user.email,
        role: user.role,
        id: user._id,
        area: user.area,
        carteira: user.carteira
      }
    });
  } catch (err) {
    console.error('[LOGIN_ERROR]', err);
    return res.status(500).json({ error: 'Erro ao autenticar.' });
  }
});

export default router;
