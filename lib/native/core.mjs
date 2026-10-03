// Pure local logic, shared by the React runner, build validation and Node tests.
export function validateContent(content) {
  const fail = (message) => { throw new Error(`Contenido nativo inválido: ${message}`); };
  const unique = (values) => new Set(values).size === values.length;
  const text = (value) => typeof value === 'string' && value.trim().length > 0;
  const items = (values) => Array.isArray(values) && values.length > 1
    && values.every(v => v && text(v.id) && text(v.label)) && unique(values.map(v => v.id));
  if (!content || content.engineVersion !== 1 || content.activityType !== 'mixed-practice'
    || !text(content.id) || !text(content.language) || !Array.isArray(content.questions) || !content.questions.length) fail('cabecera');
  if (!unique(content.questions.map(q => q?.id))) fail('IDs de pregunta duplicados');
  for (const q of content.questions) {
    if (!q || !text(q.id) || !text(q.prompt) || !text(q.explanation) || (q.note !== undefined && !text(q.note))) fail('pregunta incompleta');
    if (q.kind === 'single-choice' || q.kind === 'multiple-choice') {
      if (!items(q.options) || !Array.isArray(q.correctIds) || !q.correctIds.length || !unique(q.correctIds)
        || q.correctIds.some(id => !q.options.some(o => o.id === id))
        || (q.kind === 'single-choice' && q.correctIds.length !== 1)) fail(q.id);
      if (q.presentation !== undefined && (q.presentation !== 'true-false' || q.kind !== 'single-choice'
        || q.options.length !== 2 || !['True', 'False'].every(label => q.options.some(o => o.label === label)))) fail(q.id);
    } else if (q.kind === 'ordering') {
      if (!items(q.items) || !Array.isArray(q.correctOrder) || !unique(q.correctOrder)
        || q.correctOrder.length !== q.items.length || q.correctOrder.some(id => !q.items.some(i => i.id === id))) fail(q.id);
    } else if (q.kind === 'classification') {
      if (!items(q.items) || !items(q.categories) || !q.correctCategories
        || Object.keys(q.correctCategories).length !== q.items.length
        || q.items.some(i => !q.categories.some(c => c.id === q.correctCategories[i.id]))) fail(q.id);
    } else if (q.kind === 'year') {
      if (![q.correctYear, q.minYear, q.maxYear].every(Number.isSafeInteger)
        || q.minYear < 1 || q.maxYear > 9999 || q.minYear >= q.maxYear
        || q.correctYear < q.minYear || q.correctYear > q.maxYear) fail(q.id);
    } else if (q.kind === 'text-input') {
      if (!text(q.expectedText) || !text(q.instruction)) fail(q.id);
    } else if (q.kind === 'matching') {
      if (!items(q.left) || !items(q.right) || q.left.length !== q.right.length || !q.correctMatches
        || Object.keys(q.correctMatches).length !== q.left.length
        || !unique(Object.values(q.correctMatches))
        || q.left.some(i => !q.right.some(r => r.id === q.correctMatches[i.id]))) fail(q.id);
    } else fail(`tipo desconocido en ${q.id}`);
  }
  return content;
}

export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createAttempt(content, questionIds, random = Math.random) {
  const mode = questionIds ? 'errors' : 'all';
  questionIds ??= content.questions.map(q => q.id);
  if (!questionIds.length || new Set(questionIds).size !== questionIds.length
    || questionIds.some(id => !content.questions.some(q => q.id === id))) throw new Error('Preguntas de intento inválidas');
  // Retry subsets always retain the document's question order.
  questionIds = content.questions.filter(q => questionIds.includes(q.id)).map(q => q.id);
  const answers = {}, itemOrders = {};
  for (const q of content.questions.filter(q => questionIds.includes(q.id))) {
    let order = shuffle((q.options ?? q.items ?? q.right ?? []).map(i => i.id), random);
    // A sorting exercise must never begin with its solution already displayed.
    if (q.kind === 'ordering' && order.every((id, i) => id === q.correctOrder[i])) order = [...order.slice(1), order[0]];
    // Matching must not start with the complete solution aligned in both columns.
    if (q.kind === 'matching' && order.every((id, i) => id === q.correctMatches[q.left[i].id])) order = [...order.slice(1), order[0]];
    if (q.kind === 'classification' && order.every((id, i) => id === q.items[i].id)) order = [...order.slice(1), order[0]];
    itemOrders[q.id] = order;
    answers[q.id] = q.kind === 'ordering' ? [...order] : ['classification', 'matching'].includes(q.kind) ? {}
      : ['year', 'text-input'].includes(q.kind) ? '' : [];
  }
  return { mode, questionIds: [...questionIds], index: 0, answers, itemOrders, checked: [], completed: false };
}

export function isComplete(question, answer) {
  if (question.kind === 'year') return typeof answer === 'string' && /^\d{1,4}$/.test(answer)
    && Number(answer) >= question.minYear && Number(answer) <= question.maxYear;
  if (question.kind === 'text-input') return typeof answer === 'string' && answer.trim().length > 0;
  if (question.kind === 'matching') return Boolean(answer && typeof answer === 'object' && !Array.isArray(answer)
    && Object.keys(answer).length === question.left.length && new Set(Object.values(answer)).size === question.right.length
    && question.left.every(i => question.right.some(r => r.id === answer[i.id])));
  if (question.kind === 'classification') return Boolean(answer && !Array.isArray(answer)
    && Object.keys(answer).length === question.items.length
    && question.items.every(i => question.categories.some(c => c.id === answer[i.id])));
  if (!Array.isArray(answer) || new Set(answer).size !== answer.length) return false;
  const allowed = (question.options ?? question.items).map(i => i.id);
  if (answer.some(id => !allowed.includes(id))) return false;
  if (question.kind === 'single-choice') return answer.length === 1;
  if (question.kind === 'multiple-choice') return answer.length > 0;
  return answer.length === question.items.length;
}

export function gradeQuestion(question, answer) {
  if (!isComplete(question, answer)) return false;
  if (question.kind === 'year') return Number(answer) === question.correctYear;
  if (question.kind === 'text-input') return normalizeText(answer) === normalizeText(question.expectedText);
  if (question.kind === 'matching') return question.left.every(i => answer[i.id] === question.correctMatches[i.id]);
  if (question.kind === 'classification') return question.items.every(i => answer[i.id] === question.correctCategories[i.id]);
  if (question.kind === 'ordering') return answer.every((id, i) => id === question.correctOrder[i]);
  return answer.length === question.correctIds.length && question.correctIds.every(id => answer.includes(id));
}

export function correctAnswer(question) {
  if (question.kind === 'year') return String(question.correctYear);
  if (question.kind === 'text-input') return question.expectedText;
  if (question.kind === 'matching') return { ...question.correctMatches };
  if (question.kind === 'classification') return { ...question.correctCategories };
  return [...(question.kind === 'ordering' ? question.correctOrder : question.correctIds)];
}

// Normalization is only for comparison; keep the student's original text in state.
export function normalizeText(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en');
}

// Reassigning an occupied response frees its old partner, preserving one-to-one pairs.
export function assignMatch(question, answer, leftId, rightId) {
  if (question.kind !== 'matching' || !question.left.some(i => i.id === leftId)
    || !question.right.some(i => i.id === rightId)) throw new Error('Pareja inválida');
  const next = { ...answer };
  for (const id of Object.keys(next)) if (next[id] === rightId || id === leftId) delete next[id];
  next[leftId] = rightId;
  return next;
}

export function getResults(content, attempt) {
  const results = attempt.questionIds.map(id => {
    const question = content.questions.find(q => q.id === id);
    return { question, answer: attempt.answers[id], correct: attempt.checked.includes(id) && gradeQuestion(question, attempt.answers[id]) };
  });
  const correct = results.filter(r => r.correct).length;
  return { results, correct, total: results.length, percent: Math.round(100 * correct / results.length), incorrectIds: results.filter(r => !r.correct).map(r => r.question.id) };
}

export function reduceAttempt(content, state, action) {
  if (action.type === 'reset') return action.attempt;
  if (state.completed) return state;
  const id = state.questionIds[state.index], question = content.questions.find(q => q.id === id);
  if (action.type === 'answer' && !state.checked.includes(id)) return { ...state, answers: { ...state.answers, [id]: action.answer } };
  if (action.type === 'check' && !state.checked.includes(id) && isComplete(question, state.answers[id])) return { ...state, checked: [...state.checked, id] };
  if (action.type === 'next' && state.checked.includes(id)) return state.index === state.questionIds.length - 1
    ? { ...state, completed: true } : { ...state, index: state.index + 1 };
  return state;
}
