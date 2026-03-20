// ── NOTIFICAÇÕES ─────────────────────────────────────────────────────────────

let notificationsData = [];
let notificationsOpen = false;

function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    notificationsOpen = !notificationsOpen;
    
    if (notificationsOpen) {
        dropdown.classList.add('show');
        loadNotifications();
    } else {
        dropdown.classList.remove('show');
    }
}

async function loadNotifications() {
    if (!currentUser) return;
    
    try {
        const notificationsBody = document.getElementById('notificationsBody');
        notificationsBody.innerHTML = '<div class="notifications-loading">Carregando...</div>';
        
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
        console.error('Erro ao carregar notificações:', err);
        document.getElementById('notificationsBody').innerHTML = 
            '<div class="notification-item">Erro ao carregar notificações</div>';
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

function renderNotifications() {
    const notificationsBody = document.getElementById('notificationsBody');
    
    if (notificationsData.length === 0) {
        notificationsBody.innerHTML = `
            <div class="notification-item">
                <div class="notification-message">Nenhuma notificação no momento.</div>
            </div>
        `;
        return;
    }
    
    notificationsBody.innerHTML = notificationsData.map(notification => `
        <div class="notification-item">
            <div class="notification-title">
                <span class="notification-type ${notification.type}">${notification.type}</span>
                ${notification.title}
            </div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">Agora</div>
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

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
    if (notificationsOpen) {
        const notificationsEl = document.getElementById('navNotifications');
        if (!notificationsEl.contains(e.target)) {
            toggleNotifications();
        }
    }
});

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
