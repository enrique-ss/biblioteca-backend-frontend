const supabase = require('../database');
const { getDb } = require('../setup');
const db = getDb();

class SocialController {
  // --- AVALIAÇÕES (REVIEWS) ---

  // Adicionar ou atualizar avaliação de um livro (físico ou digital)
  adicionarAvaliacao = async (req, res) => {
    try {
      const usuario_id = req.usuario.id;
      const { livro_id, acervo_digital_id, nota, comentario } = req.body;

      if (!livro_id && !acervo_digital_id) {
        return res.status(400).json({ error: 'Deve informar livro_id ou acervo_digital_id' });
      }
      if (!nota || nota < 1 || nota > 5) {
        return res.status(400).json({ error: 'Nota deve ser entre 1 e 5' });
      }

      // Verifica se já existe avaliação deste usuário para este item
      let existing;
      if (livro_id) {
        existing = db.prepare(
          'SELECT id FROM avaliacoes WHERE usuario_id = ? AND livro_id = ?'
        ).get(usuario_id, livro_id);
      } else {
        existing = db.prepare(
          'SELECT id FROM avaliacoes WHERE usuario_id = ? AND acervo_digital_id = ?'
        ).get(usuario_id, acervo_digital_id);
      }

      if (existing) {
        db.prepare('UPDATE avaliacoes SET nota = ?, comentario = ? WHERE id = ?')
          .run(nota, comentario || null, existing.id);
      } else {
        db.prepare(
          'INSERT INTO avaliacoes (usuario_id, livro_id, acervo_digital_id, nota, comentario) VALUES (?, ?, ?, ?, ?)'
        ).run(usuario_id, livro_id || null, acervo_digital_id || null, nota, comentario || null);
      }

      res.json({ message: 'Avaliação salva com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      res.status(500).json({ error: 'Erro interno ao salvar avaliação' });
    }
  };

  // Buscar avaliações de um item
  getAvaliacoes = async (req, res) => {
    try {
      const { livro_id, acervo_digital_id } = req.query;

      if (!livro_id && !acervo_digital_id) {
        return res.status(400).json({ error: 'Deve informar livro_id ou acervo_digital_id' });
      }

      let avaliacoes;
      if (livro_id) {
        avaliacoes = db.prepare(`
          SELECT a.*, u.nome AS usuario_nome, u.avatar_url
          FROM avaliacoes a
          JOIN usuarios u ON u.id = a.usuario_id
          WHERE a.livro_id = ?
          ORDER BY a.created_at DESC
        `).all(livro_id);
      } else {
        avaliacoes = db.prepare(`
          SELECT a.*, u.nome AS usuario_nome, u.avatar_url
          FROM avaliacoes a
          JOIN usuarios u ON u.id = a.usuario_id
          WHERE a.acervo_digital_id = ?
          ORDER BY a.created_at DESC
        `).all(acervo_digital_id);
      }

      const totalNotas = avaliacoes.reduce((acc, curr) => acc + curr.nota, 0);
      const media = avaliacoes.length > 0 ? (totalNotas / avaliacoes.length).toFixed(1) : 0;

      res.json({ avaliacoes, media, total: avaliacoes.length });
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  // --- PERFIL DE LIVRO FÍSICO ---

  getLivroPerfil = async (req, res) => {
    try {
      const { id } = req.params;

      const livro = db.prepare(`
        SELECT l.*,
          COALESCE(AVG(a.nota), 0) AS media_nota,
          COUNT(a.id) AS total_avaliacoes
        FROM livros l
        LEFT JOIN avaliacoes a ON a.livro_id = l.id
        WHERE l.id = ? AND l.deleted_at IS NULL
        GROUP BY l.id
      `).get(id);

      if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });

      const avaliacoes = db.prepare(`
        SELECT av.nota, av.comentario, av.created_at, u.nome AS usuario_nome, u.avatar_url
        FROM avaliacoes av
        JOIN usuarios u ON u.id = av.usuario_id
        WHERE av.livro_id = ?
        ORDER BY av.created_at DESC
        LIMIT 10
      `).all(id);

      const minha = req.usuario
        ? db.prepare('SELECT nota, comentario FROM avaliacoes WHERE livro_id = ? AND usuario_id = ?')
            .get(id, req.usuario.id)
        : null;

      res.json({ livro, avaliacoes, minha_avaliacao: minha || null });
    } catch (error) {
      console.error('Erro ao buscar perfil do livro:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  // --- PERFIL DE LIVRO DIGITAL ---

  getDigitalPerfil = async (req, res) => {
    try {
      const { id } = req.params;

      const livro = db.prepare(`
        SELECT d.*,
          COALESCE(AVG(a.nota), 0) AS media_nota,
          COUNT(a.id) AS total_avaliacoes
        FROM acervo_digital d
        LEFT JOIN avaliacoes a ON a.acervo_digital_id = d.id
        WHERE d.id = ? AND d.deleted_at IS NULL
        GROUP BY d.id
      `).get(id);

      if (!livro) return res.status(404).json({ error: 'Livro digital não encontrado' });

      const avaliacoes = db.prepare(`
        SELECT av.nota, av.comentario, av.created_at, u.nome AS usuario_nome, u.avatar_url
        FROM avaliacoes av
        JOIN usuarios u ON u.id = av.usuario_id
        WHERE av.acervo_digital_id = ?
        ORDER BY av.created_at DESC
        LIMIT 10
      `).all(id);

      const minha = req.usuario
        ? db.prepare('SELECT nota, comentario FROM avaliacoes WHERE acervo_digital_id = ? AND usuario_id = ?')
            .get(id, req.usuario.id)
        : null;

      res.json({ livro, avaliacoes, minha_avaliacao: minha || null });
    } catch (error) {
      console.error('Erro ao buscar perfil do livro digital:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  // --- PERFIL DE CLUBE DE LEITURA ---

  getClubePerfil = async (req, res) => {
    try {
      const { id } = req.params;

      const clube = db.prepare(`
        SELECT c.*, u.nome AS criador_nome, l.titulo AS livro_titulo, l.capa_url AS livro_capa
        FROM clubes_leitura c
        JOIN usuarios u ON u.id = c.criado_por
        LEFT JOIN livros l ON l.id = c.livro_id
        WHERE c.id = ?
      `).get(id);

      if (!clube) return res.status(404).json({ error: 'Clube não encontrado' });

      // Membros = participantes que já mandaram mensagem no clube
      const membros = db.prepare(`
        SELECT DISTINCT u.id, u.nome, u.avatar_url
        FROM clube_mensagens m
        JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.clube_id = ?
        LIMIT 20
      `).all(id);

      const total_mensagens = db.prepare(
        'SELECT COUNT(*) AS cnt FROM clube_mensagens WHERE clube_id = ?'
      ).get(id)?.cnt || 0;

      res.json({ clube, membros, total_mensagens });
    } catch (error) {
      console.error('Erro ao buscar perfil do clube:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  // --- COMENTÁRIOS NO FEED ---

  adicionarComentarioFeed = async (req, res) => {
    try {
      const usuario_id = req.usuario.id;
      const { atividade_id, comentario } = req.body;

      if (!atividade_id || !comentario) {
        return res.status(400).json({ error: 'Atividade e comentário são obrigatórios' });
      }

      await supabase
        .from('atividades_comentarios')
        .insert([{ atividade_id, usuario_id, comentario }]);

      res.json({ message: 'Comentário adicionado!' });
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  getComentariosFeed = async (req, res) => {
    try {
      const { atividade_id } = req.params;

      const { data } = await supabase
        .from('atividades_comentarios')
        .select('*, usuarios(nome, avatar_url)')
        .eq('atividade_id', atividade_id)
        .order('created_at', { ascending: true });

      const comentarios = (data || []).map(c => ({
        ...c,
        usuario_nome: c.usuarios?.nome || c.usuario_nome,
        avatar_url: c.usuarios?.avatar_url || c.avatar_url
      }));

      res.json(comentarios);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  // --- CLUBES DE LEITURA ---

  criarClube = async (req, res) => {
    try {
      const criado_por = req.usuario.id;
      const { nome, descricao, livro_id } = req.body;

      if (!nome) return res.status(400).json({ error: 'Nome do clube é obrigatório' });

      const { data } = await supabase
        .from('clubes_leitura')
        .insert([{ nome, descricao, criado_por, livro_id }])
        .select()
        .single();

      res.status(201).json({ message: 'Clube criado com sucesso!', id: data?.id });
    } catch (error) {
      console.error('Erro ao criar clube:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  getClubes = async (req, res) => {
    try {
      const { busca } = req.query;
      let query = supabase
        .from('clubes_leitura')
        .select('*, livros(titulo), usuarios(nome)');

      if (busca) {
        // Busca por nome do clube ou título do livro associado
        query = query.or(`nome.ilike.%${busca}%,descricao.ilike.%${busca}%`);
      }

      const { data } = await query.order('created_at', { ascending: false });

      const clubes = (data || []).map(c => ({
        ...c,
        livro_titulo: c.livros?.titulo || c.livro_titulo,
        usuario_nome: c.usuarios?.nome || 'Bibliotecário'
      }));

      res.json(clubes);
    } catch (error) {
      console.error('Erro ao buscar clubes:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  enviarMensagemClube = async (req, res) => {
    try {
      const usuario_id = req.usuario.id;
      const clube_id = req.params.clubeId;
      const { mensagem } = req.body;

      if (!mensagem) return res.status(400).json({ error: 'Mensagem vazia' });

      await supabase
        .from('clube_mensagens')
        .insert([{ clube_id, usuario_id, mensagem }]);

      // Notifica os membros do clube via socket
      req.app.get('io').emit('novaMensagemClube', { clube_id });

      res.json({ message: 'Mensagem enviada!' });
    } catch (error) {
      console.error('Erro enviar msg:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  getMensagensClube = async (req, res) => {
    try {
      const clube_id = req.params.clubeId;

      const { data } = await supabase
        .from('clube_mensagens')
        .select(`
          *,
          usuario:usuarios!usuario_id (nome, avatar_url)
        `)
        .eq('clube_id', clube_id)
        .order('created_at', { ascending: true });

      const mensagens = (data || []).map(m => ({
        ...m,
        usuario_nome: m.usuario?.nome || 'Usuário',
        avatar_url: m.usuario?.avatar_url || null
      }));

      res.json(mensagens);
    } catch (error) {
      console.error('Erro buscar msg:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  // --- CHAT PRIVADO (MENSAGENS DIRETAS) ---

  enviarMensagemDireta = async (req, res) => {
    try {
      const remetente_id = req.usuario.id;
      const destinatario_id = req.params.userId;
      const { mensagem } = req.body;

      if (!mensagem) return res.status(400).json({ error: 'Mensagem vazia' });

      await supabase
        .from('mensagens_diretas')
        .insert([{ remetente_id, destinatario_id, mensagem }]);

      // Notifica o destinatário via socket
      req.app.get('io').to(destinatario_id).emit('novaMensagemDireta', { remetente_id });

      res.json({ message: 'Mensagem enviada!' });
    } catch (error) {
      console.error('Erro enviar msg direta:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  getMensagensDiretas = async (req, res) => {
    try {
      const usuario1 = req.usuario.id;
      const usuario2 = req.params.userId;

      // O simulador offline não suporta and() dentro de or(), então buscamos todas e filtramos no JS
      // Buscamos mensagens onde o usuário atual participa e fazemos join com o remetente para pegar nome/foto
      const { data } = await supabase
        .from('mensagens_diretas')
        .select(`
          *,
          remetente:usuarios!remetente_id (nome, avatar_url)
        `)
        .or(`remetente_id.eq.${usuario1},destinatario_id.eq.${usuario1}`);

      const mensagens = (data || [])
        .filter(m => 
          (String(m.remetente_id) === String(usuario1) && String(m.destinatario_id) === String(usuario2)) ||
          (String(m.remetente_id) === String(usuario2) && String(m.destinatario_id) === String(usuario1))
        )
        .map(m => ({
          ...m,
          usuario_nome: m.remetente?.nome || 'Usuário',
          avatar_url: m.remetente?.avatar_url || null
        }));

      res.json(mensagens || []);
    } catch (error) {
      console.error('Erro buscar msg direta:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };

  getConversasRecentes = async (req, res) => {
    try {
      const meuId = req.usuario.id;

      // 1. Busca IDs das conversas existentes (Remetente ou Destinatário)
      const { data: enviadas } = await supabase.from('mensagens_diretas').select('destinatario_id').eq('remetente_id', meuId);
      const { data: recebidas } = await supabase.from('mensagens_diretas').select('remetente_id').eq('destinatario_id', meuId);

      const idsParticipantes = new Set();
      (enviadas || []).forEach(m => idsParticipantes.add(m.destinatario_id));
      (recebidas || []).forEach(m => idsParticipantes.add(m.remetente_id));

      // 2. Busca IDs dos amigos (opcional: o usuário quer ver amigos no inbox também)
      const { data: amizades } = await supabase
        .from('amizades')
        .select('usuario_remetente, usuario_destinatario')
        .eq('status', 'aceito')
        .or(`usuario_remetente.eq.${meuId},usuario_destinatario.eq.${meuId}`);

      (amizades || []).forEach(a => {
        if (String(a.usuario_remetente) !== String(meuId)) idsParticipantes.add(a.usuario_remetente);
        if (String(a.usuario_destinatario) !== String(meuId)) idsParticipantes.add(a.usuario_destinatario);
      });

      if (idsParticipantes.size === 0) return res.json([]);

      // 3. Busca dados dos usuários
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nome, avatar_url')
        .in('id', Array.from(idsParticipantes));

      res.json(usuarios || []);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      res.status(500).json({ error: 'Erro interno' });
    }
  };
}

module.exports = new SocialController();
