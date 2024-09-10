import {MiniFramework} from "../utils/mini-framework";

/** @jsx MiniFramework.createElement */
export const Todo = ({todo, selectState, onTick, onDelete}) => {

  if (selectState === 'all' || selectState === 'active' && todo.value === false || selectState === 'completed' && todo.value === true) {
    return (
      <li id={todo.text} key={todo.id} data-testid="todo-item" className="flex group justify-between w-full text-2xl items-center first:pt-4  py-2" >
        <div className="flex space-x-6 items-center">
          <input type="checkbox" className="radio radio-error" onChange={(e) => {
            const isChecked = e.target.checked
            onTick(todo.id, isChecked)
          }} checked={todo.value}/>
          <span>{todo.text}</span>
        </div>
        <button type="button" className="hidden group-hover:block ml-auto" onClick={() => onDelete(todo.id)}>X</button>
      </li>
    )
  }
  return <div className="hidden"></div>
}