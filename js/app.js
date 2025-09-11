// Menu lateral
var menu_visible = false;
let menu = document.getElementById("nav");
function mostrarOcultarMenu(){
    if(menu_visible==false){
        menu.style.display = "block";
        menu_visible = true;
    } else {
        menu.style.display = "none";
        menu_visible = false;
    }
}
// oculto el menu una vez que selecciono una opción
let links = document.querySelectorAll("nav a");
for (var x = 0; x < links.length; x++){
    links[x].onclick = function(){
        menu.style.display = "none";
        menu_visible = false;
    }
}

// Creo las barritas de una barra particular identificada por su id
function crearBarra(id_barra){
    for (let i=0; i<=10; i++){
        let div = document.createElement("div");
        div.className = "e";
        id_barra.appendChild(div);
    }
}

// selecciono todas las barras generales para luego manipularlas
let html = document.getElementById("html");         crearBarra(html);
let javascript = document.getElementById("javascript"); crearBarra(javascript);
let wordpress = document.getElementById("wordpress");   crearBarra(wordpress); // (PHP en tu HTML)
let photoshop = document.getElementById("photoshop");   crearBarra(photoshop); // (PYTHON en tu HTML)
let php = document.getElementById("php");               crearBarra(php);       // (JAVA en tu HTML)
let ia = document.getElementById("ia");                 crearBarra(ia);        // NUEVA: Inteligencia Artificial

// Ahora voy a guardar la cantidad de barritas que se van a ir pintando por cada barra
// comienzan en -1 porque no tiene ninguna pintada al iniciarse
let contadores = [-1,-1,-1,-1,-1,-1];
// esta variable la voy a utilizar de bandera para saber si ya ejecuto la animación
let entro = false;

// función que aplica las animaciones de la habilidades
function efectoHabilidades(){
    let habilidades = document.getElementById("habilidades");
    let distancia_skills = window.innerHeight - habilidades.getBoundingClientRect().top;
    if (distancia_skills >= 300 && entro == false){
        entro = true;

        // HTML/CSS -> 60% (6 barritas)
        const intervalHtml = setInterval(function(){
            pintarBarra(html, 6, 0, intervalHtml);
        }, 100);

        // JavaScript -> 20% (2 barritas)
        const intervalJavascript = setInterval(function(){
            pintarBarra(javascript, 2, 1, intervalJavascript);
        }, 100);

        // PHP -> 30% (3 barritas) [id 'wordpress']
        const intervalWordpress = setInterval(function(){
            pintarBarra(wordpress, 3, 2, intervalWordpress);
        }, 100);

        // Python -> 20% (2 barritas) [id 'photoshop']
        const intervalPhotoshop = setInterval(function(){
            pintarBarra(photoshop, 2, 3, intervalPhotoshop);
        }, 100);

        // Java -> 50% (5 barritas) [id 'php']
        const intervalPhp = setInterval(function(){
            pintarBarra(php, 5, 4, intervalPhp);
        }, 100);

        // Inteligencia Artificial -> 50% (5 barritas)
        const intervalIA = setInterval(function(){
            pintarBarra(ia, 5, 5, intervalIA);
        }, 100);
    }
}

// lleno una barra particular con la cantidad indicada
function pintarBarra(id_barra, cantidad, indice, interval){
    contadores[indice]++;
    let x = contadores[indice];
    if (x < cantidad){
        let elementos = id_barra.getElementsByClassName("e");
        elementos[x].style.backgroundColor = "#940253";
    } else {
        clearInterval(interval);
    }
}

// detecto el scrolling del mouse para aplicar la animación de la barra
window.onscroll = function(){
    efectoHabilidades();
}