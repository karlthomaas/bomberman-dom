import {v4 as uuidv4} from 'uuid'

import {MiniFramework} from "../utils/mini-framework";
import {Todo} from "./todo";

/** @jsx MiniFramework.createElement */
export const Home = () => {
  const [todos, setTodos] = MiniFramework.useState([])
  const [selectState, setSelectState] = MiniFramework.useState('all')

  const onEnter = (text) => {
    const todo = {value: false, text: text, id: uuidv4()}
    setTodos((todos) => [...todos, todo])
  }

  const onTick = (id, value) => {
    setTodos((todos) => todos.map((todo) => todo.id === id ? {...todo, value: value} : todo))
  }

  const onDelete = (id) => {
    setTodos((todos) => todos.filter((todo) => todo.id !== id))
  }

  const clearCompletedTodos = () => {
    setTodos((todos) => todos.filter((todo) => todo.value === false))
  }

  const todoToggle = () => {
    const allChecked = todos.every((todo) => todo.value)
    if (allChecked) {
      setTodos((todos) => todos.map((todo) => ({...todo, value: false})))
    } else {
      setTodos((todos) => todos.map((todo) => ({...todo, value: true})))

    }
  }

  const todosLeft = todos.reduce((acc, todo) => acc + (todo.value ? 0 : 1), 0)

  return (
    <section id="root" className="h-full flex justify-center flex flex-col w-[550px] mx-auto relative ">
      <header data-testid="header" className="bg-white mt-24 border border-b-0">
        <h1 className="text-[80px] text-center text-red-600 absolute left-1/2 -translate-x-1/2 -top-4">todos</h1>
        <div className="flex items-center h-[65px]">
          <button data-testid="toggle-all"
                  className="btn btn-square hover:bg-white btn-ghost rounded-r-none text-xl text-neutral-400"
                  onClick={todoToggle}>
            {
              todos.length > 0 ? 'V' : ''
            }
          </button>
          <label className="hidden" form="toggle-all"></label>
          <input
            id="todo-input"
            type="text"
            className="input input-bordered w-[550px] border-none focus:outline-none text-2xl placeholder:italic"
            placeholder="What needs to be done?"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onEnter(e.target.value)
                e.target.value = ''
              }
            }}/>
          <label className="hidden" htmlFor="todo-input">New Todo Input</label>
        </div>
      </header>
      <main data-testid="main" className="bg-white border-x ">
        {todos.length > 0 ? (
          <ul data-testid="todo-list" className="flex flex-col border-t px-2 divide-y">
            {todos.map((todo, index) => <Todo key={todo.id} selectState={selectState} todo={todo} onTick={onTick}
                                              onDelete={onDelete}/>)}
          </ul>
        ) : <div className="hidden"></div>}
      </main>
      <footer data-testid="footer" className="flex justify-between border bg-white p-2">
        <span>{todosLeft} items left!</span>
        <ul className="flex space-x-3">
          <li>
            <button onClick={() => setSelectState(() => 'all')}>all</button>
          </li>
          <li>
            <button onClick={() => setSelectState(() => 'active')}>active</button>
          </li>
          <li>
            <button onClick={() => setSelectState(() => 'completed')}>completed</button>
          </li>
        </ul>
        <button onClick={clearCompletedTodos}>Clear completed</button>
      </footer>
      <footer className="info text-sm text-center mt-10 flex flex-col space-y-2 text-neutral-500">
        <p>Created by the TodoMVC team</p>
        <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
      </footer>
    </section>
  )
}