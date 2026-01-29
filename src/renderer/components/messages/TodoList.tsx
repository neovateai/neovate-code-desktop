import { TodoItem, type TodoItemProps } from './TodoItem';

interface TodoListProps {
  todos: TodoItemProps[];
}

export function TodoList({ todos }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="bg-card border border-border rounded-md p-3 text-[13px] text-muted-foreground italic">
        No todos
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-md p-3 text-[13px]">
      <div className="font-semibold mb-2 text-foreground">Todos</div>
      {todos.map((todo) => (
        <TodoItem key={todo.id} {...todo} />
      ))}
    </div>
  );
}
