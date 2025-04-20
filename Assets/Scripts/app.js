document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const newPostitBtn = document.getElementById('new-postit');
    const saveFeedback = document.querySelector('.save-feedback');
    let activePostit = null;
    let initialX;
    let initialY;
    let currentX;
    let currentY;
    let xOffset = 0;
    let yOffset = 0;
    let saveTimeout;
    let isResizing = false;
    let currentResizeElement = null;
    let originalWidth;
    let originalHeight;
    let originalMouseX;
    let originalMouseY;
    
    // Carregar os post-its salvos no localStorage
    loadPostits();
    
    // Adicionar evento para criar novo post-it
    newPostitBtn.addEventListener('click', () => {
        createNewPostit();
    });
    
    // Função para criar um novo post-it
    function createNewPostit(
        content = '', 
        x = 50, 
        y = 50, 
        id = Date.now().toString(), 
        title = '',
        colorClass = `color-${Math.floor(Math.random() * 5) + 1}`,
        width = 200,
        height = 200
    ) {
        const postit = document.createElement('div');
        postit.classList.add('postit', colorClass);
        postit.setAttribute('data-id', id);
        postit.style.left = `${x}px`;
        postit.style.top = `${y}px`;
        postit.style.width = `${width}px`;
        postit.style.height = `${height}px`;
        
        // Garantir que o novo post-it seja posicionado à frente dos outros
        const allPostits = document.querySelectorAll('.postit');
        let maxZIndex = 1;
        
        // Encontrar o maior z-index atual
        allPostits.forEach(p => {
            const zIndex = parseInt(p.style.zIndex || 1);
            if (zIndex > maxZIndex) maxZIndex = zIndex;
        });
        
        // Definir o z-index do novo post-it para o maior + 1
        postit.style.zIndex = maxZIndex + 1;
        
        // Estrutura interna do post-it com título e seletor de cores - Reordenado os elementos
        postit.innerHTML = `
            <div class="postit-header">
                <div class="postit-actions">
                    <div class="color-picker">
                        <button class="color-btn" title="Mudar cor">🎨</button>
                        <div class="color-options">
                            <div class="color-option color-1" data-color="color-1"></div>
                            <div class="color-option color-2" data-color="color-2"></div>
                            <div class="color-option color-3" data-color="color-3"></div>
                            <div class="color-option color-4" data-color="color-4"></div>
                            <div class="color-option color-5" data-color="color-5"></div>
                        </div>
                    </div>
                    <button class="delete-btn" title="Excluir">✕</button>
                </div>
            </div>
            <input type="text" class="postit-title" placeholder="Título do post-it" value="${title}">
            <textarea class="postit-content" placeholder="Escreva o que quiser aqui">${content}</textarea>
            <div class="resize-handle"></div>
        `;
        
        // Adicionar post-it ao board
        board.appendChild(postit);
        
        // Configurações para auto-crescimento do textarea
        const textarea = postit.querySelector('.postit-content');
        autoResizeTextarea(textarea);
        textarea.addEventListener('input', function() {
            autoResizeTextarea(this);
            savePostits();
        });
        
        // Configurar evento para exclusão
        postit.querySelector('.delete-btn').addEventListener('click', () => {
            deletePostit(postit);
        });
        
        // Configurar eventos para arrastar
        postit.addEventListener('mousedown', dragStart);
        postit.addEventListener('touchstart', dragStart, { passive: false });
        
        // Configurar seletor de cores com posicionamento melhorado
        const colorBtn = postit.querySelector('.color-btn');
        const colorOptions = postit.querySelector('.color-options');
        
        colorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Fechar todas as outras paletas de cores
            document.querySelectorAll('.color-options.show').forEach(menu => {
                menu.classList.remove('show');
            });
            
            // Posicionar a paleta ACIMA do post-it
            const btnRect = colorBtn.getBoundingClientRect();
            const boardRect = board.getBoundingClientRect();
            
            // Remover a paleta de cores do post-it e adicioná-la diretamente ao body
            // para evitar problemas de posicionamento e overflow
            if (!colorOptions.parentElement.isEqualNode(document.body)) {
                // Salvar a referência ao post-it original na paleta
                colorOptions.setAttribute('data-postit-id', postit.getAttribute('data-id'));
                document.body.appendChild(colorOptions);
            }
            
            // Posicionar acima do post-it
            colorOptions.style.position = 'fixed';
            colorOptions.style.left = `${btnRect.left}px`;
            colorOptions.style.top = `${btnRect.top - 50}px`; // 50px acima do botão
            
            // Mostrar a paleta
            colorOptions.classList.toggle('show');
            
            // Ajuste adicional para garantir que a paleta fique totalmente visível
            const colorOptionsRect = colorOptions.getBoundingClientRect();
            if (colorOptionsRect.right > window.innerWidth) {
                colorOptions.style.left = `${window.innerWidth - colorOptionsRect.width - 10}px`;
            }
            if (colorOptionsRect.top < 0) {
                colorOptions.style.top = '10px'; // Garantir que não fique fora da tela
            }
        });
        
        // Fechar o seletor de cores ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.color-btn') && !e.target.closest('.color-options')) {
                document.querySelectorAll('.color-options.show').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
        
        // Configurar opções de cores - Solução definitiva para o problema de mudança de posição
        const colorOptionElements = colorOptions.querySelectorAll('.color-option');
        colorOptionElements.forEach(option => {
            option.addEventListener('click', () => {
                const newColor = option.getAttribute('data-color');
                
                // Capturar todas as propriedades de estilo e posição ANTES de qualquer alteração
                const computedStyle = window.getComputedStyle(postit);
                const left = computedStyle.left;
                const top = computedStyle.top;
                const width = computedStyle.width;
                const height = computedStyle.height;
                const zIndex = computedStyle.zIndex;
                
                // Remover classes de cor existentes
                for (let i = 1; i <= 5; i++) {
                    postit.classList.remove(`color-${i}`);
                }
                
                // Adicionar a nova classe de cor
                postit.classList.add(newColor);
                
                // Aplicar EXPLICITAMENTE todas as propriedades de posição e dimensões novamente
                postit.style.position = 'absolute';
                postit.style.left = left;
                postit.style.top = top;
                postit.style.width = width;
                postit.style.height = height;
                postit.style.zIndex = zIndex;
                
                // Salvar alterações
                savePostits();
                
                // Fechar o seletor de cores
                colorOptions.classList.remove('show');
            });
        });
        
        // Evento para salvar texto ao digitar no título
        const titleInput = postit.querySelector('.postit-title');
        titleInput.addEventListener('input', () => {
            savePostits();
        });
        
        // Evento para foco
        postit.addEventListener('mousedown', (e) => {
            if (!isResizing) {
                bringToFront(postit);
            }
        });
        
        // Configurar redimensionamento
        const resizeHandle = postit.querySelector('.resize-handle');
        resizeHandle.addEventListener('mousedown', initResize);
        
        // Salvar estado
        savePostits();
        
        return postit;
    }
    
    // Função para auto-redimensionar o textarea
    function autoResizeTextarea(textarea) {
        // Reset height para calcular corretamente
        textarea.style.height = 'auto';
        
        // Definir a nova altura baseada no conteúdo
        const newHeight = Math.max(100, textarea.scrollHeight + 10); // Adicionando mais 10px para evitar corte
        textarea.style.height = newHeight + 'px';
        
        // Ajustar altura do post-it para acomodar o textarea
        const postit = textarea.closest('.postit');
        const titleHeight = postit.querySelector('.postit-title').offsetHeight;
        const headerHeight = postit.querySelector('.postit-header').offsetHeight;
        const padding = 40; // Aumentado o padding para garantir espaço suficiente
        
        const minHeight = newHeight + titleHeight + headerHeight + padding;
        
        // Só ajusta se a nova altura calculada for maior que a altura atual
        const currentHeight = parseInt(getComputedStyle(postit).height);
        if (minHeight > currentHeight) {
            postit.style.height = minHeight + 'px';
        }
    }
    
    // Iniciar redimensionamento
    function initResize(e) {
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        currentResizeElement = e.target.closest('.postit');
        
        originalWidth = parseFloat(getComputedStyle(currentResizeElement).getPropertyValue('width'));
        originalHeight = parseFloat(getComputedStyle(currentResizeElement).getPropertyValue('height'));
        originalMouseX = e.clientX;
        originalMouseY = e.clientY;
        
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
        
        bringToFront(currentResizeElement);
    }
    
    // Realizar redimensionamento durante o arraste
    function doResize(e) {
        if (isResizing && currentResizeElement) {
            // Calculando a nova largura e altura
            const width = originalWidth + (e.clientX - originalMouseX);
            const height = originalHeight + (e.clientY - originalMouseY);
            
            // Verificando tamanhos mínimos
            if (width > 150) {
                currentResizeElement.style.width = width + 'px';
            }
            
            if (height > 150) {
                currentResizeElement.style.height = height + 'px';
            }
            
            // Redimensionar o textarea para acompanhar o post-it
            const textarea = currentResizeElement.querySelector('.postit-content');
            adjustTextareaHeight(textarea, height);
        }
    }
    
    // Ajustar altura do textarea durante redimensionamento
    function adjustTextareaHeight(textarea, containerHeight) {
        if (textarea) {
            const postit = textarea.closest('.postit');
            const titleHeight = postit.querySelector('.postit-title').offsetHeight;
            const headerHeight = postit.querySelector('.postit-header').offsetHeight;
            const padding = 40; // Aumentado o padding para garantir espaço suficiente
            
            const newHeight = containerHeight - titleHeight - headerHeight - padding;
            if (newHeight > 100) { // Mínimo de 100px
                textarea.style.height = newHeight + 'px';
            }
        }
    }
    
    // Finalizar redimensionamento
    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
        
        if (currentResizeElement) {
            savePostits();
            currentResizeElement = null;
        }
    }
    
    // Função para excluir um post-it
    function deletePostit(postit) {
        postit.remove();
        savePostits();
    }
    
    // Funções para arrastar
    function dragStart(e) {
        if (e.target.classList.contains('postit-content') || 
            e.target.classList.contains('postit-title') || 
            e.target.classList.contains('delete-btn') || 
            e.target.classList.contains('color-btn') ||
            e.target.classList.contains('resize-handle')) {
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
    
    // Exibir feedback de salvamento
    function updateSaveFeedback(status = 'saved') {
        saveFeedback.classList.remove('saving', 'error');
        
        if (status === 'saving') {
            saveFeedback.textContent = 'Salvando alterações...';
            saveFeedback.classList.add('saving');
        } else if (status === 'error') {
            saveFeedback.textContent = 'Erro ao salvar! Tente novamente.';
            saveFeedback.classList.add('error');
        } else {
            saveFeedback.textContent = 'Todas alterações salvas';
        }
    }
    
    // Salvar post-its no localStorage com feedback
    function savePostits() {
        try {
            updateSaveFeedback('saving');
            
            const postits = document.querySelectorAll('.postit');
            const postitData = [];
            
            postits.forEach(postit => {
                postitData.push({
                    id: postit.getAttribute('data-id'),
                    title: postit.querySelector('.postit-title').value,
                    content: postit.querySelector('.postit-content').value,
                    x: parseInt(postit.style.left),
                    y: parseInt(postit.style.top),
                    zIndex: parseInt(postit.style.zIndex || 1),
                    color: getColorClass(postit),
                    width: parseInt(postit.style.width),
                    height: parseInt(postit.style.height)
                });
            });
            
            localStorage.setItem('postits', JSON.stringify(postitData));
            
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
            
            saveTimeout = setTimeout(() => {
                updateSaveFeedback('saved');
            }, 800);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            updateSaveFeedback('error');
        }
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
        try {
            const savedPostits = JSON.parse(localStorage.getItem('postits'));
            
            if (savedPostits && savedPostits.length > 0) {
                savedPostits.forEach(data => {
                    const postit = createNewPostit(
                        data.content, 
                        data.x, 
                        data.y, 
                        data.id, 
                        data.title || '', 
                        data.color || 'color-1',
                        data.width || 200,
                        data.height || 200
                    );
                    postit.style.zIndex = data.zIndex || 1;
                    
                    // Ajustar o textarea para o tamanho correto após carregar
                    const textarea = postit.querySelector('.postit-content');
                    setTimeout(() => autoResizeTextarea(textarea), 0);
                });
            }
            updateSaveFeedback('saved');
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            updateSaveFeedback('error');
        }
    }
});
