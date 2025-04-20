document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const newPostitBtn = document.getElementById('new-postit');
    let activePostit = null;
    let initialX;
    let initialY;
    let currentX;
    let currentY;
    let xOffset = 0;
    let yOffset = 0;
    
    // Carregar os post-its salvos no localStorage
    loadPostits();
    
    // Adicionar evento para criar novo post-it
    newPostitBtn.addEventListener('click', createNewPostit);
    
    // Função para criar um novo post-it
    function createNewPostit(content = '', x = 50, y = 50, id = Date.now().toString()) {
        const colorClass = `color-${Math.floor(Math.random() * 5) + 1}`;
        const postit = document.createElement('div');
        postit.classList.add('postit', colorClass);
        postit.setAttribute('data-id', id);
        postit.style.left = `${x}px`;
        postit.style.top = `${y}px`;
        
        // Estrutura interna do post-it
        postit.innerHTML = `
            <div class="postit-header">
                <button class="delete-btn" title="Excluir">✕</button>
            </div>
            <textarea class="postit-content" placeholder="Digite seu texto aqui...">${content}</textarea>
        `;
        
        // Adicionar post-it ao board
        board.appendChild(postit);
        
        // Configurar evento para exclusão
        postit.querySelector('.delete-btn').addEventListener('click', () => {
            deletePostit(postit);
        });
        
        // Configurar eventos para arrastar
        postit.addEventListener('mousedown', dragStart);
        postit.addEventListener('touchstart', dragStart, { passive: false });
        
        // Evento para salvar texto ao digitar
        const textarea = postit.querySelector('.postit-content');
        textarea.addEventListener('input', () => {
            savePostits();
        });
        
        // Evento para foco
        postit.addEventListener('mousedown', () => {
            bringToFront(postit);
        });
        
        // Salvar estado
        savePostits();
        
        return postit;
    }
    
    // Função para excluir um post-it
    function deletePostit(postit) {
        postit.remove();
        savePostits();
    }
    
    // Funções para arrastar
    function dragStart(e) {
        if (e.target.classList.contains('postit-content') || 
            e.target.classList.contains('delete-btn')) {
            return;
        }
        
        activePostit = this;
        
        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
            e.preventDefault();
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);
        
        bringToFront(activePostit);
    }
    
    function drag(e) {
        if (activePostit) {
            e.preventDefault();
            
            if (e.type === "touchmove") {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }
            
            xOffset = currentX;
            yOffset = currentY;
            
            setTranslate(currentX, currentY, activePostit);
        }
    }
    
    function dragEnd() {
        if (activePostit) {
            // Atualizar posição
            const left = parseInt(activePostit.style.left) || 0;
            const top = parseInt(activePostit.style.top) || 0;
            
            activePostit.style.left = `${left + currentX}px`;
            activePostit.style.top = `${top + currentY}px`;
            activePostit.style.transform = '';
            
            xOffset = 0;
            yOffset = 0;
            
            // Salvar estado
            savePostits();
            activePostit = null;
        }
        
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchend', dragEnd);
    }
    
    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
    
    // Trazer post-it para frente
    function bringToFront(postit) {
        // Obter todos os post-its
        const allPostits = document.querySelectorAll('.postit');
        let maxZIndex = 1;
        
        // Encontrar o maior z-index atual
        allPostits.forEach(p => {
            const zIndex = parseInt(p.style.zIndex || 1);
            if (zIndex > maxZIndex) maxZIndex = zIndex;
        });
        
        // Definir o z-index do post-it ativo para o maior + 1
        postit.style.zIndex = maxZIndex + 1;
    }
    
    // Salvar post-its no localStorage
    function savePostits() {
        const postits = document.querySelectorAll('.postit');
        const postitData = [];
        
        postits.forEach(postit => {
            postitData.push({
                id: postit.getAttribute('data-id'),
                content: postit.querySelector('.postit-content').value,
                x: parseInt(postit.style.left),
                y: parseInt(postit.style.top),
                zIndex: parseInt(postit.style.zIndex || 1),
                color: getColorClass(postit)
            });
        });
        
        localStorage.setItem('postits', JSON.stringify(postitData));
    }
    
    // Obter classe de cor do post-it
    function getColorClass(postit) {
        for (let i = 1; i <= 5; i++) {
            if (postit.classList.contains(`color-${i}`)) {
                return `color-${i}`;
            }
        }
        return 'color-1';
    }
    
    // Carregar post-its do localStorage
    function loadPostits() {
        const savedPostits = JSON.parse(localStorage.getItem('postits'));
        
        if (savedPostits && savedPostits.length > 0) {
            savedPostits.forEach(data => {
                const postit = createNewPostit(data.content, data.x, data.y, data.id);
                postit.style.zIndex = data.zIndex || 1;
                
                // Remover classes de cor existentes e adicionar a salva
                for (let i = 1; i <= 5; i++) {
                    postit.classList.remove(`color-${i}`);
                }
                postit.classList.add(data.color || 'color-1');
            });
        }
    }
});
