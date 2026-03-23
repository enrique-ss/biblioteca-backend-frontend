// ── NOTIFICAÇÕES ─────────────────────────────────────────────────────────────

let notificationsData = [];
// Dropdown logic removed. Alertas now use a full screen.

async function loadNotificationsFull() {
    await loadNotifications();
    renderNotificationsFullScreen();
}

async function loadNotifications() {
    if (!currentUser) return;
    
    try {
        const notificationsBody = document.getElementById('notificationsFullScreenBody');
        if (notificationsBody) notificationsBody.innerHTML = '<div style="text-align:center; padding:40px; color:var(--gold);">Carregando...</div>';
        
        // Carrega notificações baseadas no tipo de usuário
        const promises = [];
        
        if (currentUser.tipo === 'bibliotecario') {
            promises.push(loadAdminNotifications());
        } else {
            promises.push(loadUserNotifications());
        }
        
        const allNotifications = await Promise.all(promises);
        notificationsData = allNotifications.flat();
        
        renderNotifications();
        updateNotificationBadge();
    } catch (err) {
        const body = document.getElementById('notificationsFullScreenBody');
        if (body) body.innerHTML = '<div style="text-align:center; padding:40px; color:var(--crimson);">Erro ao carregar notificações</div>';
    }
}

async function loadAdminNotifications() {
    const notifications = [];
    
    try {
        // Buscar empréstimos atrasados
        const { data: atrasados } = await api('/alugueis/atrasados');
        if (atrasados.total > 0) {
            notifications.push({
                type: 'warning',
                title: 'Empréstimos Atrasados',
                message: `${atrasados.total} empréstimo(s) em atraso precisam de atenção.`,
                count: atrasados.total
            });
        }
        
        // Buscar usuários com multas pendentes
        const { data: usuarios } = await api('/usuarios?limit=100');
        const usuariosComMulta = usuarios.filter(u => u.multa_pendente);
        if (usuariosComMulta.length > 0) {
            notifications.push({
                type: 'danger',
                title: 'Multas Pendentes',
                message: `${usuariosComMulta.length} usuário(s) com multas pendentes.`,
                count: usuariosComMulta.length
            });
        }
        
        // Buscar usuários bloqueados
        const usuariosBloqueados = usuarios.filter(u => u.bloqueado);
        if (usuariosBloqueados.length > 0) {
            notifications.push({
                type: 'info',
                title: 'Usuários Bloqueados',
                message: `${usuariosBloqueados.length} usuário(s) bloqueados no sistema.`,
                count: usuariosBloqueados.length
            });
        }
        
    } catch (err) {
        console.error('Erro ao carregar notificações admin:', err);
    }
    
    return notifications;
}

async function loadUserNotifications() {
    const notifications = [];
    
    try {
        // Buscar multas do usuário
        const { data: multas } = await api('/alugueis/multas/minhas');
        const multasPendentes = multas.filter(m => m.status === 'pendente');
        
        if (multasPendentes.length > 0) {
            const total = multasPendentes.reduce((sum, m) => sum + Number(m.valor), 0);
            notifications.push({
                type: 'danger',
                title: 'Multas Pendentes',
                message: `Você tem ${multasPendentes.length} multa(s) no valor total de R$ ${total.toFixed(2)}.`,
                count: multasPendentes.length
            });
        }
        
        // Buscar empréstimos atrasados do usuário
        const { data: meusAlugueis } = await api('/alugueis/meus');
        const atrasados = meusAlugueis.filter(a => a.status === 'atrasado');
        
        if (atrasados.length > 0) {
            notifications.push({
                type: 'warning',
                title: 'Empréstimos Atrasados',
                message: `Você tem ${atrasados.length} empréstimo(s) atrasado(s).`,
                count: atrasados.length
            });
        }
        
    } catch (err) {
        console.error('Erro ao carregar notificações usuário:', err);
    }
    
    return notifications;
}

function renderNotificationsFullScreen() {
    const body = document.getElementById('notificationsFullScreenBody');
    if (!body) return;
    
    if (notificationsData.length === 0) {
        body.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-faint); font-style: italic; font-size: var(--fs-md);">
                Nenhum alerta pendente no momento. Tudo tranquilo!
            </div>
        `;
        return;
    }
    
    body.innerHTML = notificationsData.map(notification => `
        <div style="padding: 24px; border-bottom: 1px solid var(--border-m); margin-bottom: 8px; transition: background 0.3s; border-radius: var(--r-md);" onmouseover="this.style.background='var(--gold-bg-subtle)'" onmouseleave="this.style.background='transparent'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <strong style="color: var(--gold); font-family: 'Cinzel', serif; font-size: var(--fs-md); letter-spacing: 0.05em;">
                    <span class="notification-type ${notification.type}" style="font-family: 'Crimson Pro', serif; font-size: 0.7em; margin-right: 8px; vertical-align: middle;">${notification.type.toUpperCase()}</span> 
                    ${notification.title}
                </strong>
                <span style="color: var(--text-dim); font-size: var(--fs-xs); font-style: italic;">Agora</span>
            </div>
            <div style="color: var(--text); font-size: var(--fs-base); line-height: 1.6;">${notification.message}</div>
        </div>
    `).join('');
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationsBadge');
    const count = notificationsData.length;
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.add('show');
    } else {
        badge.classList.remove('show');
    }
}

// Evento de click fora da tela dropdown removido pois agora é tela cheia

// Atualizar navbar para mostrar notificações
function updateNotificationsVisibility() {
    const notificationsEl = document.getElementById('navNotifications');
    if (notificationsEl) {
        notificationsEl.style.display = currentUser ? 'block' : 'none';
    }
}

// Sobrescrever updateNavbar para incluir notificações
const originalUpdateNavbar = window.updateNavbar;
window.updateNavbar = function() {
    if (originalUpdateNavbar) originalUpdateNavbar();
    updateNotificationsVisibility();
    
    // Carregar notificações se estiver logado
    if (currentUser) {
        loadNotifications();
    }
};
