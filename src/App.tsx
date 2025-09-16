import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import * as todoService from './api/todos';
import { Todo } from './types/Todo';
import { TodoList } from './components/TodoList/TodoList';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Filter } from './types/Filter';
import { ErrorNotification } from './components/ErrorNotification';
import { ErrorMessage } from './types/ErrorMessage';
import { TodoItem } from './components/TodoItem';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo>();
  const [errorMessage, setErrorMessage] = useState<ErrorMessage>('');
  const [filter, setFilter] = useState<Filter>('all');
  const [title, setTitle] = useState('');
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [processings, setProcessings] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    todoService
      .getTodos()
      .then(setTodos)
      .catch(() => {
        setErrorMessage('Unable to load todos');

        setTimeout(() => setErrorMessage(''), 3000);
      });

    inputRef.current?.focus();
  }, []);

  const filteredTodos = useMemo(() => {
    return todos?.filter(todo => {
      return filter === 'all'
        ? true
        : filter === 'completed'
          ? todo.completed
          : !todo.completed;
    });
  }, [filter, todos]);

  const activeTodos = useMemo(() => {
    return todos.filter(todo => !todo.completed);
  }, [todos]);

  const completedTodos = useMemo(() => {
    return todos.filter(todo => todo.completed);
  }, [todos]);

  const deleteTodo = (todoId: number) => {
    setErrorMessage('');

    if (!processings.includes(todoId)) {
      setProcessings(ids => [...ids, todoId]);
    }

    return todoService
      .deleteTodo(todoId)
      .then(() =>
        setTodos(currentTodos =>
          currentTodos.filter(todo => todo.id !== todoId),
        ),
      )
      .catch(() => {
        setErrorMessage('Unable to delete a todo');
        setTimeout(() => setErrorMessage(''), 3000);
      })
      .finally(() => {
        setProcessings(ids => ids.filter(id => id !== todoId));
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      });
  };

  const deleteCompletedTodos = async () => {
    const idsToDelete = completedTodos.map(todo => todo.id);

    setProcessings(ids => [...ids, ...idsToDelete]);

    const results = await Promise.allSettled(
      idsToDelete.map(id => todoService.deleteTodo(id)),
    );

    const successfullyDeletedIds = results
      .map((result, index) =>
        result.status === 'fulfilled' ? idsToDelete[index] : undefined,
      )
      .filter(id => id !== undefined);

    setTodos(current =>
      current.filter(todo => !successfullyDeletedIds.includes(todo.id)),
    );
    setProcessings(ids =>
      ids.filter(id => !successfullyDeletedIds.includes(id)),
    );

    const hasError = results.some(result => result.status === 'rejected');

    if (hasError) {
      setErrorMessage('Unable to delete some todos');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const addTodo = () => {
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Title should not be empty');
      setTimeout(() => setErrorMessage(''), 3000);

      return Promise.resolve();
    }

    setIsInputDisabled(true);

    setProcessings(ids => [...ids, 0]);

    setTempTodo({
      title: title.trim(),
      id: 0,
      completed: false,
      userId: todoService.USER_ID,
    });

    return todoService
      .addTodo(title.trim())
      .then(newTodo => setTodos(currentTodos => [...currentTodos, newTodo]))
      .catch(error => {
        setErrorMessage('Unable to add a todo');
        setTimeout(() => setErrorMessage(''), 3000);
        throw error;
      })
      .finally(() => {
        setIsInputDisabled(false);
        setTempTodo(undefined);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      });
  };

  const reset = () => {
    setTitle('');
  };

  if (!todoService.USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          isButtonActive={todos.every(todo => todo.completed)}
          isButtonExists={todos.length > 0}
          inputRef={inputRef}
          title={title}
          isInputDisabled={isInputDisabled}
          onTitleChange={setTitle}
          onAddTodo={addTodo}
          reset={reset}
        />

        {filteredTodos && (
          <TodoList
            todos={filteredTodos}
            onDelete={deleteTodo}
            processings={processings}
          />
        )}

        {tempTodo && (
          <TodoItem
            todo={tempTodo}
            key={`temp-${tempTodo.id}`}
            onDelete={deleteTodo}
            isProcessed={processings.includes(tempTodo.id)}
          />
        )}

        {todos.length !== 0 && activeTodos && (
          <Footer
            numberOfActiveTodos={activeTodos.length}
            filter={filter}
            onFilterChange={setFilter}
            isClearButtonDisabled={todos.every(todo => !todo.completed)}
            onDeleteCompletedTodos={deleteCompletedTodos}
          />
        )}
      </div>

      <ErrorNotification
        errorMessage={errorMessage}
        onClose={setErrorMessage}
      />
    </div>
  );
};
