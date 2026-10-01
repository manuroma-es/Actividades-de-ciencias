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
    } else if (q.kind === 'ordering') {
      if (!items(q.items) || !Array.isArray(q.correctOrder) || !unique(q.correctOrder)
        || q.correctOrder.length !== q.items.length || q.correctOrder.some(id => !q.items.some(i => i.id === id))) fail(q.id);
    } else if (q.kind === 'classification') {
      if (!items(q.items) || !items(q.categories) || !q.correctCategories
        || Object.keys(q.correctCategories).length !== q.items.length
        || q.items.some(i => !q.categories.some(c => c.id === q.correctCategories[i.id]))) fail(q.id);
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
  const answers = {}, itemOrders = {};
  for (const q of content.questions.filter(q => questionIds.includes(q.id))) {
    let order = shuffle((q.options ?? q.items).map(i => i.id), random);
    // A sorting exercise must never begin with its solution already displayed.
    if (q.kind === 'ordering' && order.every((id, i) => id === q.correctOrder[i])) order = [...order.slice(1), order[0]];
    itemOrders[q.id] = order;
    answers[q.id] = q.kind === 'ordering' ? [...order] : q.kind === 'classification' ? {} : [];
  }
  return { mode, questionIds: [...questionIds], index: 0, answers, itemOrders, checked: [], completed: false };
}

export function isComplete(question, answer) {
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
  if (question.kind === 'classification') return question.items.every(i => answer[i.id] === question.correctCategories[i.id]);
  if (question.kind === 'ordering') return answer.every((id, i) => id === question.correctOrder[i]);
  return answer.length === question.correctIds.length && question.correctIds.every(id => answer.includes(id));
}

export function correctAnswer(question) {
  if (question.kind === 'classification') return { ...question.correctCategories };
  return [...(question.kind === 'ordering' ? question.correctOrder : question.correctIds)];
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
