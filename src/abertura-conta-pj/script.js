// Formulário em etapas de abertura de conta PJ (portado do widget HTML do Elementor).
// Consulta o CNPJ na BrasilAPI para preencher razão social e endereço e envia tudo (arquivos em base64) para o webhook do n8n.

const CNPJ_API = "https://brasilapi.com.br/api/cnpj/v1/";
const WEBHOOK_URL = "https://n8n.prod.asupernova.com.br/webhook/abertura-conta-pj";

document.addEventListener("DOMContentLoaded", function() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
  const form = document.getElementById("auvpForm");
  const submitBtn = document.getElementById("submitBtn");
  const errorMessage = document.getElementById("errorMessage");
  const successMessage = document.getElementById("successMessage");
  const steps = document.querySelectorAll(".form-step");
  const stepperItems = document.querySelectorAll(".stepper-item");
  const prevStepBtn = document.getElementById("prevStepBtn");
  const nextStepBtn = document.getElementById("nextStepBtn");
  const reviewSummary = document.getElementById("reviewSummary");
  let currentStepIndex = 0;
  const cnpjField = document.getElementById("cnpj");
  const cpfField = document.getElementById("cpf");
  const telefoneField = document.getElementById("telefone");
  const estruturaSocietariaRadios = document.querySelectorAll("input[name=\"estruturaSocietaria\"]");
  const outroEstruturaSocietariaGroup = document.getElementById("outroEstruturaSocietariaGroup");
  const outroEstruturaSocietariaField = document.getElementById("outroEstruturaSocietaria");
  const entidadeReguladaRadios = document.querySelectorAll("input[name=\"entidadeRegulada\"]");
  const orgaoReguladorGroup = document.getElementById("orgaoReguladorGroup");
  const orgaoReguladorField = document.getElementById("orgaoRegulador");
  const relacionamentoGovernoRadios = document.querySelectorAll("input[name=\"relacionamentoGoverno\"]");
  const descricaoRelacionamentoGroup = document.getElementById("descricaoRelacionamentoGroup");
  const descricaoRelacionamentoField = document.getElementById("descricaoRelacionamentoGoverno");
  const operacoesCambioRadios = document.querySelectorAll("input[name=\"operacoesCambio\"]");
  const volumeCambioGroup = document.getElementById("volumeCambioGroup");
  const volumeCambioRadios = document.querySelectorAll("input[name=\"volumeCambio\"]");
  const grupoEconomicoRadios = document.querySelectorAll("input[name=\"grupoEconomico\"]");
  const nomeGrupoGroup = document.getElementById("nomeGrupoGroup");
  const nomeGrupoField = document.getElementById("nomeGrupoEconomico");
  const comoConheceuRadios = document.querySelectorAll("input[name=\"comoConheceu\"]");
  const outroComoConheceuGroup = document.getElementById("outroComoConheceuGroup");
  const outroComoConheceuField = document.getElementById("outroComoConheceu");
  const meiRadios = document.querySelectorAll("input[name=\"meiStatus\"]");
  const contratoSocialGroup = document.getElementById("contratoSocialGroup");
  const contratoSocialInput = document.getElementById("contratoSocial");
  const ccmeiGroup = document.getElementById("ccmeiGroup");
  const ccmeiInput = document.getElementById("ccmei");
  setupStepper();
  setupFileUploads();
  setupFieldFormatting();
  setupConditionalFields();
  setupFormSubmission();
  function setupFileUploads() {
    const fileInputs = document.querySelectorAll("input[type=\"file\"]");
    fileInputs.forEach((input) => {
      const uploadBtn = input.parentElement.querySelector(".upload-btn");
      uploadBtn.addEventListener("click", () => {
        input.click();
      });
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const fileName = file.name;
          const fileSize = (file.size / (1024 * 1024)).toFixed(2);
          if (file.size > 4 * 1024 * 1024) {
            alert("Arquivo muito grande. O tamanho máximo é 4MB.");
            input.value = "";
            return;
          }
          uploadBtn.textContent = `${fileName} (${fileSize}MB)`;
          uploadBtn.classList.add("has-file");
        }
      });
    });
  }
  function setupFieldFormatting() {
    cnpjField.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      value = value.replace(/^(\d{2})(\d)/, "$1.$2");
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
      value = value.replace(/(\d{4})(\d)/, "$1-$2");
      e.target.value = value.substring(0, 18);
    });
    cnpjField.addEventListener("blur", (e) => {
      if (e.target.value.length === 18) {
        consultarCNPJ(e.target.value);
      }
    });
    cpfField.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      e.target.value = value.substring(0, 14);
    });
    telefoneField.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      value = value.replace(/^(\d{2})(\d)/, "($1) $2");
      value = value.replace(/(\d{5})(\d{4})$/, "$1-$2");
      e.target.value = value.substring(0, 15);
    });
    function formatCurrency(value) {
      value = value.replace(/\D/g, "");
      if (value === "") return "";
      value = (parseInt(value) / 100).toFixed(2);
      value = value.replace(".", ",");
      value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
      return "R$ " + value;
    }
    const patrimonioField = document.getElementById("patrimonioEstimado");
    const faturamentoField = document.getElementById("faturamentoAnual");
    [patrimonioField, faturamentoField].forEach((field) => {
      if (field) {
        field.addEventListener("input", (e) => {
          e.target.value = formatCurrency(e.target.value);
        });
      }
    });
  }
  async function consultarCNPJ(cnpj) {
    const cnpjNumeros = cnpj.replace(/\D/g, "");
    const razaoSocialField = document.getElementById("razaoSocial");
    const enderecoField = document.getElementById("endereco");
    const statusEl = document.getElementById("cnpj-status");
    if (cnpjNumeros.length !== 14) {
      statusEl.textContent = "";
      return;
    }
    const razaoSocialManual = razaoSocialField.value;
    const enderecoManual = enderecoField.value;
    razaoSocialField.disabled = true;
    enderecoField.disabled = true;
    statusEl.textContent = "Buscando dados do CNPJ...";
    statusEl.style.color = "var(--gray-700)";
    try {
      const response = await fetch(`${CNPJ_API}${cnpjNumeros}`);
      if (!response.ok) {
        const errorText = response.status === 404 ? "CNPJ não encontrado." : "Erro ao consultar o serviço.";
        throw new Error(errorText);
      }
      const data = await response.json();
      razaoSocialField.value = data.razao_social || "";
      const address = [
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
        data.municipio ? `${data.municipio} - ${data.uf}` : "",
        data.cep
      ].filter(Boolean).join(", ");
      enderecoField.value = address;
      statusEl.textContent = "Dados preenchidos automaticamente.";
      statusEl.style.color = "#16a34a";
    } catch (error) {
      console.error("Erro na consulta CNPJ:", error);
      statusEl.textContent = `${error.message} Por favor, preencha os dados manualmente.`;
      statusEl.style.color = "#dc2626";
      razaoSocialField.value = razaoSocialManual;
      enderecoField.value = enderecoManual;
      razaoSocialField.placeholder = "Preencha a razão social manualmente";
      enderecoField.placeholder = "Preencha o endereço manualmente";
    } finally {
      razaoSocialField.disabled = false;
      enderecoField.disabled = false;
      setTimeout(() => {
        if (statusEl) statusEl.textContent = "";
      }, 6e3);
    }
  }
  function setupConditionalFields() {
    estruturaSocietariaRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.value === "Outros" && radio.checked) {
          outroEstruturaSocietariaGroup.style.display = "block";
          outroEstruturaSocietariaField.required = true;
        } else {
          outroEstruturaSocietariaGroup.style.display = "none";
          outroEstruturaSocietariaField.required = false;
          outroEstruturaSocietariaField.value = "";
        }
      });
    });
    entidadeReguladaRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.value === "sim" && radio.checked) {
          orgaoReguladorGroup.style.display = "block";
          orgaoReguladorField.required = true;
        } else {
          orgaoReguladorGroup.style.display = "none";
          orgaoReguladorField.required = false;
          orgaoReguladorField.value = "";
        }
      });
    });
    relacionamentoGovernoRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.value === "sim" && radio.checked) {
          descricaoRelacionamentoGroup.style.display = "block";
          descricaoRelacionamentoField.required = true;
        } else {
          descricaoRelacionamentoGroup.style.display = "none";
          descricaoRelacionamentoField.required = false;
          descricaoRelacionamentoField.value = "";
        }
      });
    });
    operacoesCambioRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.value === "sim" && radio.checked) {
          volumeCambioGroup.style.display = "block";
          volumeCambioRadios.forEach((volumeRadio) => {
            volumeRadio.required = true;
          });
        } else {
          volumeCambioGroup.style.display = "none";
          volumeCambioRadios.forEach((volumeRadio) => {
            volumeRadio.required = false;
            volumeRadio.checked = false;
          });
        }
      });
    });
    grupoEconomicoRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.value === "sim" && radio.checked) {
          nomeGrupoGroup.style.display = "block";
          nomeGrupoField.required = true;
        } else {
          nomeGrupoGroup.style.display = "none";
          nomeGrupoField.required = false;
          nomeGrupoField.value = "";
        }
      });
    });
    const empresaOperacionalRadios = document.querySelectorAll("input[name=\"empresaOperacional\"]");
    const operacoesEmpresaGroup = document.getElementById("operacoesEmpresaGroup");
    const operacoesEmpresaField = document.getElementById("operacoesEmpresa");
    empresaOperacionalRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.value === "sim" && radio.checked) {
          operacoesEmpresaGroup.style.display = "block";
          operacoesEmpresaField.required = true;
        } else {
          operacoesEmpresaGroup.style.display = "none";
          operacoesEmpresaField.required = false;
          operacoesEmpresaField.value = "";
        }
      });
    });
    comoConheceuRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.value === "Outro" && radio.checked) {
          outroComoConheceuGroup.style.display = "block";
          outroComoConheceuField.required = true;
        } else {
          outroComoConheceuGroup.style.display = "none";
          outroComoConheceuField.required = false;
          outroComoConheceuField.value = "";
        }
      });
    });
    const instituicoesCheckboxes = document.querySelectorAll("input[name=\"instituicoesTransferencia\"]");
    const outroInstituicaoGroup = document.getElementById("outroInstituicaoGroup");
    const outroInstituicaoField = document.getElementById("outroInstituicao");
    instituicoesCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const outroCheckbox = document.querySelector("input[name=\"instituicoesTransferencia\"][value=\"Outro\"]");
        if (outroCheckbox && outroCheckbox.checked) {
          outroInstituicaoGroup.style.display = "block";
          outroInstituicaoField.required = true;
        } else {
          outroInstituicaoGroup.style.display = "none";
          outroInstituicaoField.required = false;
          outroInstituicaoField.value = "";
        }
      });
    });
    const expectativasCheckboxes = document.querySelectorAll("input[name=\"expectativasInvestimento\"]");
    const outrosExpectativasGroup = document.getElementById("outrosExpectativasGroup");
    const outrosExpectativasField = document.getElementById("outrosExpectativas");
    expectativasCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const outrosCheckbox = document.querySelector("input[name=\"expectativasInvestimento\"][value=\"Outros\"]");
        if (outrosCheckbox && outrosCheckbox.checked) {
          outrosExpectativasGroup.style.display = "block";
          outrosExpectativasField.required = true;
        } else {
          outrosExpectativasGroup.style.display = "none";
          outrosExpectativasField.required = false;
          outrosExpectativasField.value = "";
        }
      });
    });
    meiRadios.forEach((radio) => {
      radio.addEventListener("change", updateDocumentUploadsForMEI);
    });
    updateDocumentUploadsForMEI();
  }
  function updateDocumentUploadsForMEI() {
    const isMEI = document.querySelector("input[name=\"meiStatus\"]:checked")?.value === "sim";
    if (isMEI) {
      if (contratoSocialGroup) contratoSocialGroup.style.display = "none";
      if (ccmeiGroup) ccmeiGroup.style.display = "block";
      if (contratoSocialInput) {
        contratoSocialInput.required = false;
        contratoSocialInput.value = "";
      }
      if (ccmeiInput) {
        ccmeiInput.required = true;
      }
    } else {
      if (contratoSocialGroup) contratoSocialGroup.style.display = "block";
      if (ccmeiGroup) ccmeiGroup.style.display = "none";
      if (ccmeiInput) {
        ccmeiInput.required = false;
        ccmeiInput.value = "";
      }
      if (contratoSocialInput) {
        contratoSocialInput.required = true;
      }
    }
  }
  function setupFormSubmission() {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideMessages();
      document.querySelectorAll(".field-error").forEach((el) => {
        el.classList.remove("field-error");
      });
      document.querySelectorAll(".error-inline").forEach((el) => {
        el.remove();
      });
      const validation = validateForm();
      if (!validation.isValid) {
        const firstError = validation.errors[0];
        showErrorMessage([firstError]);
        let labelText = null;
        if (firstError.includes("é obrigatório")) {
          labelText = firstError.replace(" é obrigatório", "").replace("é obrigatório", "").trim();
        } else if (firstError.includes("obrigatória")) {
          labelText = firstError.replace(" é obrigatória", "").replace("obrigatória", "").trim();
        }
        let labelEl = Array.from(document.querySelectorAll("label")).find((l) => l.textContent.replace(/\*/g, "").trim().includes(labelText));
        if (labelEl) {
          let stepDiv = labelEl.closest(".form-step");
          if (stepDiv && !stepDiv.classList.contains("active")) {
            let stepIndex = Array.from(document.querySelectorAll(".form-step")).indexOf(stepDiv);
            if (stepIndex >= 0) {
              goToStep(stepIndex);
            }
          }
          setTimeout(() => {
            labelEl.classList.add("field-error");
            const span = document.createElement("span");
            span.className = "error-inline";
            span.style.color = "#dc2626";
            span.style.fontWeight = "bold";
            span.style.marginLeft = "8px";
            span.textContent = "Preencha este campo";
            labelEl.appendChild(span);
            const input = labelEl.parentElement.querySelector("input,textarea,select");
            if (input) {
              input.focus();
              input.scrollIntoView({
                behavior: "smooth",
                block: "center"
              });
            } else {
              labelEl.scrollIntoView({
                behavior: "smooth",
                block: "center"
              });
            }
          }, 100);
        }
        return;
      }
      setLoadingState(true);
      try {
        const toBase64WithMeta = (file) => new Promise((resolve, reject) => {
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve({
            nome: file.name,
            tipo: file.type,
            tamanho: file.size,
            base64: reader.result.split(",")[1]
          });
          reader.onerror = (error) => reject(error);
        });
        const isMEI = document.querySelector("input[name=\"meiStatus\"]:checked")?.value === "sim";
        const contratoSocialFile = isMEI ? form.ccmei?.files[0] : form.contratoSocial?.files[0];
        const contratoSocial = await toBase64WithMeta(contratoSocialFile);
        const documentoIdentificacao = await toBase64WithMeta(form.documentoIdentificacao?.files[0]);
        const balanco = await toBase64WithMeta(form.balanco?.files[0]);
        const payload = {
          timestamp: new Date().toISOString(),
          dadosEmpresa: {
            cnpj: form.cnpj.value,
            razaoSocial: form.razaoSocial.value,
            emailEmpresa: form.emailEmpresa.value,
            endereco: form.endereco.value,
            estruturaSocietaria: form.estruturaSocietaria.value === "Outros" ? form.outroEstruturaSocietaria.value : form.estruturaSocietaria.value,
            contratoSocial
          },
          usuarioMaster: {
            nomeCompleto: form.nomeCompleto.value,
            emailUsuario: form.emailUsuario.value,
            cpf: form.cpf.value,
            telefone: form.telefone.value,
            conhecimentoMercado: form.conhecimentoMercado.value,
            documentoIdentificacao
          },
          informacoesComplementares: {
            empresaOperacional: form.empresaOperacional.value,
            operacoesEmpresa: form.operacoesEmpresa.value,
            ramoAtividades: form.ramoAtividades.value,
            origemPatrimonio: form.origemPatrimonio.value,
            contextoPatrimonio: form.contextoPatrimonio.value,
            expectativasInvestimentoCheckbox: Array.from(document.querySelectorAll("input[name=\"expectativasInvestimento\"]:checked")).map((cb) => cb.value),
            outrosExpectativas: form.outrosExpectativas.value || null,
            origemRecursos: form.origemRecursos.value,
            patrimonioEstimado: form.patrimonioEstimado.value,
            entidadeRegulada: form.entidadeRegulada.value,
            orgaoRegulador: form.orgaoRegulador.value || null,
            relacionamentoGoverno: form.relacionamentoGoverno.value,
            descricaoRelacionamentoGoverno: form.descricaoRelacionamentoGoverno.value || null,
            operacoesCambio: form.operacoesCambio.value,
            volumeCambio: form.volumeCambio ? form.volumeCambio.value : null,
            grupoEconomico: form.grupoEconomico.value,
            nomeGrupoEconomico: form.nomeGrupoEconomico.value || null,
            faturamentoAnual: form.faturamentoAnual.value,
            balanco,
            expectativasInvestimentos: form.expectativasInvestimentos.value,
            instituicoesTransferencia: Array.from(document.querySelectorAll("input[name=\"instituicoesTransferencia\"]:checked")).map((cb) => cb.value),
            outroInstituicao: form.outroInstituicao.value || null,
            comoConheceu: form.comoConheceu.value,
            outroComoConheceu: form.outroComoConheceu.value || null
          }
        };
        const response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          showSuccessMessage("✅ Formulário enviado com sucesso! Sua solicitação foi recebida e será analisada em breve. Em caso de dúvidas, entraremos em contato pelo e-mail informado.");
          form.reset();
          resetConditionalFields();
          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        } else {
          const errorData = await response.text();
          throw new Error(`Erro no envio: ${response.status} ${errorData}`);
        }
      } catch (error) {
        console.error("Submission Error:", error);
        showErrorMessage(["Ocorreu um erro ao enviar o formulário. Por favor, tente novamente mais tarde."]);
      } finally {
        setLoadingState(false);
      }
    });
  }
  function validateForm() {
    const errors = [];
    const requiredFields = [
      {
        field: "cnpj",
        name: "CNPJ"
      },
      {
        field: "razaoSocial",
        name: "Razão Social"
      },
      {
        field: "emailEmpresa",
        name: "E-mail da empresa"
      },
      {
        field: "endereco",
        name: "Endereço"
      },
      {
        field: "nomeCompleto",
        name: "Nome completo"
      },
      {
        field: "emailUsuario",
        name: "E-mail do usuário"
      },
      {
        field: "cpf",
        name: "CPF"
      },
      {
        field: "telefone",
        name: "Telefone"
      },
      {
        field: "documentoIdentificacao",
        name: "Documento de Identificação"
      },
      {
        field: "ramoAtividades",
        name: "Ramo de atividades"
      },
      {
        field: "origemPatrimonio",
        name: "Origem do patrimônio e principais atividades"
      },
      {
        field: "origemRecursos",
        name: "Origem dos recursos"
      },
      {
        field: "patrimonioEstimado",
        name: "Patrimônio estimado"
      },
      {
        field: "faturamentoAnual",
        name: "Faturamento anual"
      },
      {
        field: "expectativasInvestimentos",
        name: "Expectativas com investimentos"
      }
    ];
    requiredFields.forEach(({ field, name }) => {
      const element = document.getElementById(field);
      if (element && !element.value.trim()) {
        errors.push(`${name} é obrigatório`);
      }
    });
    const radioGroups = [
      {
        name: "conhecimentoMercado",
        label: "Conhecimento no mercado financeiro"
      },
      {
        name: "meiStatus",
        label: "Empresa é MEI"
      },
      {
        name: "estruturaSocietaria",
        label: "Estrutura societária"
      },
      {
        name: "empresaOperacional",
        label: "Empresa operacional"
      },
      {
        name: "entidadeRegulada",
        label: "Entidade regulada"
      },
      {
        name: "relacionamentoGoverno",
        label: "Relacionamento com governo"
      },
      {
        name: "operacoesCambio",
        label: "Operações de câmbio"
      },
      {
        name: "grupoEconomico",
        label: "Parte de grupo econômico"
      },
      {
        name: "comoConheceu",
        label: "Como conheceu a AUVP Capital"
      }
    ];
    radioGroups.forEach(({ name, label }) => {
      if (!document.querySelector(`input[name="${name}"]:checked`)) {
        errors.push(`${label} é obrigatório`);
      }
    });
    if (document.querySelectorAll("input[name=\"instituicoesTransferencia\"]:checked").length === 0) {
      errors.push("Selecione pelo menos uma instituição de transferência");
    }
    if (document.querySelectorAll("input[name=\"expectativasInvestimento\"]:checked").length === 0) {
      errors.push("Selecione pelo menos uma expectativa com investimentos");
    }
    if (document.querySelector("input[name=\"estruturaSocietaria\"]:checked")?.value === "Outros" && !outroEstruturaSocietariaField.value.trim()) {
      errors.push("Especificação da estrutura societária é obrigatória");
    }
    if (document.querySelector("input[name=\"empresaOperacional\"]:checked")?.value === "sim" && !document.getElementById("operacoesEmpresa").value.trim()) {
      errors.push("Onde a empresa opera é obrigatório");
    }
    if (document.querySelector("input[name=\"entidadeRegulada\"]:checked")?.value === "sim" && !orgaoReguladorField.value.trim()) {
      errors.push("Órgão regulador é obrigatório");
    }
    if (document.querySelector("input[name=\"relacionamentoGoverno\"]:checked")?.value === "sim" && !descricaoRelacionamentoField.value.trim()) {
      errors.push("Descrição do relacionamento com governo é obrigatória");
    }
    if (document.querySelector("input[name=\"operacoesCambio\"]:checked")?.value === "sim" && !document.querySelector("input[name=\"volumeCambio\"]:checked")) {
      errors.push("Volume de câmbio é obrigatório");
    }
    if (document.querySelector("input[name=\"grupoEconomico\"]:checked")?.value === "sim" && !nomeGrupoField.value.trim()) {
      errors.push("Nome do grupo econômico é obrigatório");
    }
    if (document.querySelector("input[name=\"comoConheceu\"]:checked")?.value === "Outro" && !outroComoConheceuField.value.trim()) {
      errors.push("Especificação de \"Como conheceu\" é obrigatória");
    }
    if (document.querySelector("input[name=\"instituicoesTransferencia\"][value=\"Outro\"]")?.checked && !document.getElementById("outroInstituicao").value.trim()) {
      errors.push("Especificação da instituição é obrigatória");
    }
    if (document.querySelector("input[name=\"expectativasInvestimento\"][value=\"Outros\"]")?.checked && !document.getElementById("outrosExpectativas").value.trim()) {
      errors.push("Especificação de outras expectativas é obrigatória");
    }
    const meiStatusValue = document.querySelector("input[name=\"meiStatus\"]:checked")?.value;
    if (meiStatusValue === "sim") {
      if (!(form.ccmei && form.ccmei.files.length)) {
        errors.push("CCMEI é obrigatório para MEI");
      }
    } else if (meiStatusValue === "nao") {
      if (!(form.contratoSocial && form.contratoSocial.files.length)) {
        errors.push("Contrato Social Assinado é obrigatório");
      }
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  function showErrorMessage(errors) {
    errorMessage.innerHTML = `
                <h4>Por favor, corrija o campo destacado:</h4>
                <ul>
                    ${errors.map((error) => `<li>${error}</li>`).join("")}
                </ul>`;
    errorMessage.style.display = "block";
    errorMessage.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
  function showSuccessMessage(message) {
    successMessage.textContent = message;
    successMessage.style.display = "block";
    successMessage.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
  function hideMessages() {
    errorMessage.style.display = "none";
    successMessage.style.display = "none";
  }
  function setLoadingState(loading) {
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando...";
      form.classList.add("loading");
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar Formulário";
      form.classList.remove("loading");
    }
  }
  function resetConditionalFields() {
    const conditionalGroups = [
      outroEstruturaSocietariaGroup,
      orgaoReguladorGroup,
      descricaoRelacionamentoGroup,
      volumeCambioGroup,
      nomeGrupoGroup,
      outroComoConheceuGroup,
      document.getElementById("outroInstituicaoGroup"),
      document.getElementById("outrosExpectativasGroup"),
      document.getElementById("operacoesEmpresaGroup"),
      contratoSocialGroup,
      ccmeiGroup
    ];
    conditionalGroups.forEach((group) => {
      if (group) group.style.display = "none";
    });
    const conditionalInputs = [
      outroEstruturaSocietariaField,
      orgaoReguladorField,
      descricaoRelacionamentoField,
      nomeGrupoField,
      outroComoConheceuField,
      document.getElementById("outroInstituicao"),
      document.getElementById("outrosExpectativas"),
      document.getElementById("operacoesEmpresa"),
      contratoSocialInput,
      ccmeiInput
    ];
    conditionalInputs.forEach((input) => {
      if (input) input.required = false;
    });
    volumeCambioRadios.forEach((radio) => radio.required = false);
    document.querySelectorAll(".upload-btn").forEach((btn) => {
      btn.textContent = "Adicionar arquivo";
      btn.classList.remove("has-file");
    });
    goToStep(0);
    if (reviewSummary) reviewSummary.innerHTML = "";
    updateDocumentUploadsForMEI();
  }
  function setupStepper() {
    prevStepBtn.addEventListener("click", () => {
      goToStep(currentStepIndex - 1);
    });
    nextStepBtn.addEventListener("click", (e) => {
      if (!validateCurrentStep()) return;
      goToStep(currentStepIndex + 1);
    });
    stepperItems.forEach((item, index) => {
      item.addEventListener("click", (e) => {
        if (index > currentStepIndex && !validateCurrentStep()) return;
        goToStep(index);
      });
    });
    goToStep(0);
    function validateCurrentStep() {
      document.querySelectorAll(".field-error").forEach((el) => {
        el.classList.remove("field-error");
      });
      document.querySelectorAll(".error-inline").forEach((el) => {
        el.remove();
      });
      hideMessages();
      const activeStep = document.querySelector(".form-step.active");
      if (!activeStep) return true;
      const requiredFields = Array.from(activeStep.querySelectorAll("input[required],textarea[required],select[required]"));
      let firstInvalid = null;
      for (const field of requiredFields) {
        if (field.type === "radio" || field.type === "checkbox") {
          const name = field.name;
          const group = activeStep.querySelectorAll(`input[name='${name}']`);
          if (!Array.from(group).some((f) => f.checked)) {
            firstInvalid = field;
            break;
          }
        } else if (!field.value.trim()) {
          firstInvalid = field;
          break;
        }
      }
      if (firstInvalid) {
        let labelEl = activeStep.querySelector(`label[for='${firstInvalid.id}']`) || firstInvalid.closest(".form-group")?.querySelector("label");
        if (labelEl) {
          labelEl.classList.add("field-error");
          const span = document.createElement("span");
          span.className = "error-inline";
          span.style.color = "#dc2626";
          span.style.fontWeight = "bold";
          span.style.marginLeft = "8px";
          span.textContent = "Preencha este campo";
          labelEl.appendChild(span);
        }
        showErrorMessage(["Preencha todos os campos obrigatórios antes de avançar."]);
        if (firstInvalid) {
          firstInvalid.focus();
          firstInvalid.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }
        return false;
      }
      return true;
    }
  }
  function goToStep(index) {
    if (index < 0 || index >= steps.length) return;
    if (currentStepIndex === 0 && index > 0 && cnpjField) {
      const unmaskedCNPJ = cnpjField.value.replace(/\D/g, "");
      if (unmaskedCNPJ.length === 14) {
        consultarCNPJ(cnpjField.value);
      }
    }
    currentStepIndex = index;
    steps.forEach((step, stepIndex) => {
      step.classList.toggle("active", stepIndex === currentStepIndex);
    });
    stepperItems.forEach((item, stepIndex) => {
      item.classList.toggle("active", stepIndex === currentStepIndex);
      item.classList.toggle("completed", stepIndex < currentStepIndex);
    });
    prevStepBtn.disabled = currentStepIndex === 0;
    if (currentStepIndex === steps.length - 1) {
      nextStepBtn.style.display = "none";
      populateReview();
    } else {
      nextStepBtn.style.display = "";
    }
  }
  function populateReview() {
    if (!reviewSummary) return;
    const checkedEstrutura = document.querySelector("input[name=\"estruturaSocietaria\"]:checked");
    const estructuraValue = checkedEstrutura ? checkedEstrutura.value === "Outros" ? form.outroEstruturaSocietaria.value : checkedEstrutura.value : "Não informado";
    const expectationList = getCheckedValues("input[name=\"expectativasInvestimento\"]");
    const instituicoesList = getCheckedValues("input[name=\"instituicoesTransferencia\"]");
    const reviewItems = [
      {
        label: "Empresa",
        value: formatSummaryValue(`${form.razaoSocial.value || "Não informado"} (${form.cnpj.value || "Não informado"})`)
      },
      {
        label: "Estrutura societária",
        value: formatSummaryValue(estructuraValue)
      },
      {
        label: "Representante",
        value: formatSummaryValue(`${form.nomeCompleto.value || "Não informado"} · ${form.emailUsuario.value || "Não informado"}`)
      },
      {
        label: "Expectativas",
        value: formatSummaryValue(expectationList.join(", ") || "Não informado")
      },
      {
        label: "Instituições de origem",
        value: formatSummaryValue(instituicoesList.join(", ") || "Não informado")
      },
      {
        label: "Como conheceu",
        value: formatSummaryValue(document.querySelector("input[name=\"comoConheceu\"]:checked")?.value || "Não informado")
      }
    ];
    reviewSummary.innerHTML = reviewItems.map((item) => `<li><strong>${item.label}</strong><span>${item.value}</span></li>`).join("");
  }
  function formatSummaryValue(value) {
    return value && value.trim() ? value : "Não informado";
  }
  function getCheckedValues(selector) {
    return Array.from(document.querySelectorAll(selector)).filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
  }
});
