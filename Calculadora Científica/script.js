(function () {
  "use strict";

  const elExpressao = document.getElementById("expressao");
  const elResultado = document.getElementById("resultado");
  const elListaHistorico = document.getElementById("lista-historico");
  const elIndMemoria = document.getElementById("ind-memoria");
  const elIndAngulo = document.getElementById("ind-angulo");

  const estado = {
    expressao: "",
    ans: 0,
    memoria: 0,
    modo: "DEG",
    apenasCalculou: false
  };

  const FUNCOES = [
    "asin", "acos", "atan", "sin", "cos", "tan",
    "sqrt", "cbrt", "log", "ln", "abs", "exp"
  ];

  const CONSTANTES = ["pi", "e"];

  const PRECEDENCIA = {
    "+": 1, "-": 1,
    "*": 2, "/": 2, "mod": 2,
    "u-": 3, "u+": 3,
    "^": 4
  };

  const DIREITA = { "^": true, "u-": true, "u+": true };

  function normalizar(entrada) {
    return entrada.trim();
  }

  function tokenizar(texto) {
    const tokens = [];
    let i = 0;

    while (i < texto.length) {
      const c = texto[i];

      if (c === " ") { i++; continue; }

      if (/[0-9.]/.test(c)) {
        let numero = "";
        while (i < texto.length && /[0-9.]/.test(texto[i])) {
          numero += texto[i++];
        }
        if ((numero.match(/\./g) || []).length > 1) throw new Error("Número inválido");
        tokens.push({ tipo: "numero", valor: parseFloat(numero) });
        continue;
      }

      if (/[a-zA-Z]/.test(c)) {
        let restante = texto.slice(i);
        const nome = FUNCOES.concat(CONSTANTES, ["mod"])
          .sort((a, b) => b.length - a.length)
          .find((n) => restante.startsWith(n));

        if (!nome) throw new Error("Termo desconhecido: " + c);
        i += nome.length;

        if (FUNCOES.includes(nome)) {
          tokens.push({ tipo: "funcao", valor: nome });
        } else if (nome === "mod") {
          tokens.push({ tipo: "operador", valor: "mod" });
        } else {
          tokens.push({ tipo: "constante", valor: nome === "pi" ? Math.PI : Math.E });
        }
        continue;
      }

      if ("+-*/^%!()".includes(c)) {
        tokens.push({ tipo: c === "(" ? "parenteses-abre" : c === ")" ? "parenteses-fecha" : "operador", valor: c });
        i++;
        continue;
      }

      throw new Error("Caractere inválido: " + c);
    }

    const comMultiplicacao = [];
    for (const t of tokens) {
      const ant = comMultiplicacao[comMultiplicacao.length - 1];
      const encerraValor = ant && (ant.tipo === "numero" || ant.tipo === "constante" || ant.tipo === "parenteses-fecha");
      const iniciaValor = t.tipo === "numero" || t.tipo === "constante" || t.tipo === "funcao" || t.tipo === "parenteses-abre";
      if (encerraValor && iniciaValor) {
        comMultiplicacao.push({ tipo: "operador", valor: "*" });
      }
      comMultiplicacao.push(t);
    }

    return comMultiplicacao;
  }

  function paraRPN(tokens) {
    const saida = [];
    const pilha = [];

    for (let idx = 0; idx < tokens.length; idx++) {
      const t = tokens[idx];

      if (t.tipo === "numero" || t.tipo === "constante") {
        saida.push(t);
        continue;
      }

      if (t.tipo === "funcao") {
        pilha.push(t);
        continue;
      }

      if (t.tipo === "operador" && (t.valor === "-" || t.valor === "+")) {
        const ant = idx === 0 ? null : tokens[idx - 1];
        const terminaValor = ant && (
          ant.tipo === "numero" ||
          ant.tipo === "constante" ||
          ant.tipo === "parenteses-fecha" ||
          (ant.tipo === "operador" && (ant.valor === "!" || ant.valor === "%"))
        );
        if (!terminaValor) {
          pilha.push({ tipo: "operador", valor: t.valor === "-" ? "u-" : "u+" });
          continue;
        }
      }

      if (t.tipo === "operador" && t.valor === "!") {
        saida.push({ tipo: "operador", valor: "!" });
        continue;
      }

      if (t.tipo === "operador" && t.valor === "%") {
        saida.push({ tipo: "operador", valor: "%" });
        continue;
      }

      if (t.tipo === "operador") {
        while (pilha.length) {
          const topo = pilha[pilha.length - 1];
          if (topo.tipo === "funcao") break;
          if (topo.tipo !== "operador") break;
          const pTopo = PRECEDENCIA[topo.valor] || 0;
          const pAtual = PRECEDENCIA[t.valor];
          if (pTopo > pAtual || (pTopo === pAtual && !DIREITA[t.valor])) {
            saida.push(pilha.pop());
          } else break;
        }
        pilha.push(t);
        continue;
      }

      if (t.tipo === "parenteses-abre") {
        pilha.push(t);
        continue;
      }

      if (t.tipo === "parenteses-fecha") {
        let achou = false;
        while (pilha.length) {
          const topo = pilha.pop();
          if (topo.tipo === "parenteses-abre") { achou = true; break; }
          saida.push(topo);
        }
        if (!achou) throw new Error("Parêntese desbalanceado");
        if (pilha.length && pilha[pilha.length - 1].tipo === "funcao") {
          saida.push(pilha.pop());
        }
        continue;
      }
    }

    while (pilha.length) {
      const topo = pilha.pop();
      if (topo.tipo === "parenteses-abre") throw new Error("Parêntese desbalanceado");
      saida.push(topo);
    }

    return saida;
  }

  function fatorial(n) {
    if (n < 0 && Number.isInteger(n)) throw new Error("Fatorial de negativo");
    if (Number.isInteger(n) && n >= 0 && n <= 170) {
      let r = 1;
      for (let k = 2; k <= n; k++) r *= k;
      return r;
    }
    return gamma(n + 1);
  }

  function gamma(z) {
    const g = 7;
    const C = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    let x = C[0];
    for (let i = 1; i < g + 2; i++) x += C[i] / (z + i);
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  function paraRadianos(v) {
    return estado.modo === "DEG" ? (v * Math.PI) / 180 : v;
  }

  function deRadianos(v) {
    return estado.modo === "DEG" ? (v * 180) / Math.PI : v;
  }

  function aplicarFuncao(nome, x) {
    switch (nome) {
      case "sin": return Math.sin(paraRadianos(x));
      case "cos": return Math.cos(paraRadianos(x));
      case "tan": return Math.tan(paraRadianos(x));
      case "asin": return deRadianos(Math.asin(x));
      case "acos": return deRadianos(Math.acos(x));
      case "atan": return deRadianos(Math.atan(x));
      case "sqrt": if (x < 0) throw new Error("Raiz de negativo"); return Math.sqrt(x);
      case "cbrt": return Math.cbrt(x);
      case "log": if (x <= 0) throw new Error("log inválido"); return Math.log10(x);
      case "ln": if (x <= 0) throw new Error("ln inválido"); return Math.log(x);
      case "abs": return Math.abs(x);
      case "exp": return Math.exp(x);
      default: throw new Error("Função desconhecida");
    }
  }

  function avaliarRPN(rpn) {
    const pilha = [];

    for (const t of rpn) {
      if (t.tipo === "numero" || t.tipo === "constante") {
        pilha.push(t.valor);
        continue;
      }

      if (t.tipo === "funcao") {
        if (!pilha.length) throw new Error("Expressão incompleta");
        pilha.push(aplicarFuncao(t.valor, pilha.pop()));
        continue;
      }

      if (t.tipo === "operador") {
        if (t.valor === "u-") { if (!pilha.length) throw new Error("Expressão incompleta"); pilha.push(-pilha.pop()); continue; }
        if (t.valor === "u+") continue;
        if (t.valor === "!") { if (!pilha.length) throw new Error("Expressão incompleta"); pilha.push(fatorial(pilha.pop())); continue; }
        if (t.valor === "%") { if (!pilha.length) throw new Error("Expressão incompleta"); pilha.push(pilha.pop() / 100); continue; }

        if (pilha.length < 2) throw new Error("Expressão incompleta");
        const b = pilha.pop();
        const a = pilha.pop();
        switch (t.valor) {
          case "+": pilha.push(a + b); break;
          case "-": pilha.push(a - b); break;
          case "*": pilha.push(a * b); break;
          case "/": if (b === 0) throw new Error("Divisão por zero"); pilha.push(a / b); break;
          case "mod": if (b === 0) throw new Error("Divisão por zero"); pilha.push(a % b); break;
          case "^": pilha.push(Math.pow(a, b)); break;
          default: throw new Error("Operador desconhecido");
        }
      }
    }

    if (pilha.length !== 1) throw new Error("Expressão inválida");
    return pilha[0];
  }

  function calcular(texto) {
    const rpn = paraRPN(tokenizar(normalizar(texto)));
    const valor = avaliarRPN(rpn);
    if (!isFinite(valor)) throw new Error("Resultado inválido");
    return valor;
  }

  function formatarNumero(n) {
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return n.toExponential(6);
    return parseFloat(n.toPrecision(12)).toString();
  }

  function paraExibicao(texto) {
    return texto
      .replace(/\*/g, "\u00d7")
      .replace(/\//g, "\u00f7")
      .replace(/pi/g, "\u03c0")
      .replace(/sqrt/g, "\u221a")
      .replace(/cbrt/g, "\u221b");
  }

  function atualizarVisorPreview() {
    elExpressao.textContent = paraExibicao(estado.expressao);

    if (!estado.expressao) {
      elResultado.textContent = "0";
      return;
    }

    try {
      const valor = calcular(estado.expressao);
      elResultado.textContent = formatarNumero(valor);
      elResultado.style.color = "#f8fafc";
    } catch (e) {
      if (estado.expressao.trim()) {
        elResultado.style.color = "#64748b";
      }
    }
  }

  function inserir(valor) {
    if (estado.apenasCalculou) {
      const continuar = /^[+\-*/^%!]|mod/.test(valor) || valor === ")";
      if (!continuar) estado.expressao = "";
      estado.apenasCalculou = false;
    }
    estado.expressao += valor;
    atualizarVisorPreview();
  }

  function adicionarHistorico(expr, res) {
    const item = document.createElement("li");
    const texto = document.createElement("span");
    texto.textContent = paraExibicao(expr) + " =";
    const valor = document.createElement("strong");
    valor.textContent = formatarNumero(res);
    item.appendChild(texto);
    item.appendChild(valor);
    item.addEventListener("click", () => {
      estado.expressao = expr;
      estado.apenasCalculou = false;
      atualizarVisorPreview();
    });
    elListaHistorico.prepend(item);
    while (elListaHistorico.children.length > 20) {
      elListaHistorico.removeChild(elListaHistorico.lastChild);
    }
  }

  function definirModo(modo) {
    estado.modo = modo;
    elIndAngulo.textContent = modo;
  }

  function calcularEExibir() {
    if (!estado.expressao.trim()) return;
    try {
      const valor = calcular(estado.expressao);
      const expr = estado.expressao;
      adicionarHistorico(expr, valor);
      estado.ans = valor;
      elExpressao.textContent = paraExibicao(expr) + " =";
      elResultado.textContent = formatarNumero(valor);
      elResultado.style.color = "#34d399";
      estado.expressao = formatarNumero(valor);
      estado.apenasCalculou = true;
    } catch (e) {
      elResultado.textContent = "Erro";
      elResultado.style.color = "#f87171";
    }
  }

  function alternarSinal() {
    if (estado.apenasCalculou) {
      estado.expressao = "";
      estado.apenasCalculou = false;
    }
    const m = estado.expressao.match(/(-?\d*\.?\d+)$/);
    if (m) {
      const inicio = estado.expressao.length - m[0].length;
      const texto = m[0].startsWith("-") ? m[0].slice(1) : "-" + m[0];
      estado.expressao = estado.expressao.slice(0, inicio) + texto;
    } else {
      estado.expressao += "(-";
    }
    atualizarVisorPreview();
  }

  function tratarAcao(acao) {
    switch (acao) {
      case "calcular": calcularEExibir(); break;
      case "limpar":
        estado.expressao = "";
        estado.apenasCalculou = false;
        elExpressao.textContent = "";
        elResultado.textContent = "0";
        elResultado.style.color = "#f8fafc";
        break;
      case "apagar":
        if (estado.apenasCalculou) {
          estado.expressao = "";
          estado.apenasCalculou = false;
        } else {
          estado.expressao = estado.expressao.replace(/(sqrt\(|cbrt\(|asin\(|acos\(|atan\(|sin\(|cos\(|tan\(|log\(|ln\(|abs\(|exp\(|mod|10\^|.)$/, "");
        }
        atualizarVisorPreview();
        break;
      case "ans": inserir(formatarNumero(estado.ans)); break;
      case "mais-menos": alternarSinal(); break;
      case "deg": definirModo("DEG"); break;
      case "rad": definirModo("RAD"); break;
      case "mc":
        estado.memoria = 0;
        elIndMemoria.classList.remove("ativo");
        break;
      case "mr": inserir(formatarNumero(estado.memoria)); break;
      case "ms":
        estado.memoria = obterValorAtual();
        elIndMemoria.classList.add("ativo");
        break;
      case "m-plus":
        estado.memoria += obterValorAtual();
        elIndMemoria.classList.add("ativo");
        break;
      case "m-minus":
        estado.memoria -= obterValorAtual();
        elIndMemoria.classList.add("ativo");
        break;
      default: break;
    }
  }

  function obterValorAtual() {
    try {
      return calcular(estado.expressao);
    } catch (e) {
      return estado.ans;
    }
  }

  document.querySelectorAll(".tecla").forEach((botao) => {
    botao.addEventListener("click", () => {
      if (botao.dataset.valor !== undefined) {
        inserir(botao.dataset.valor);
      } else if (botao.dataset.acao) {
        tratarAcao(botao.dataset.acao);
      }
    });
  });

  const MAPA_TECLADO = {
    "/": "/", "*": "*", "-": "-", "+": "+", "^": "^", "%": "%", "!": "!",
    "(": "(", ")": "(", ".": ".", ",": "."
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calcularEExibir(); return; }
    if (e.key === "Backspace") { e.preventDefault(); tratarAcao("apagar"); return; }
    if (e.key === "Escape") { tratarAcao("limpar"); return; }
    if (/^[0-9]$/.test(e.key)) { inserir(e.key); return; }
    if (MAPA_TECLADO[e.key] !== undefined) { inserir(MAPA_TECLADO[e.key]); }
  });

  atualizarVisorPreview();
})();
