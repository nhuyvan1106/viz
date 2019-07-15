import * as React from 'react';
import { Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

import { SimulationStatusLoggerMessage } from './SimulationStatusLoggerMessage';
import { Wait } from '@shared/wait';

import './SimulationStatusLogger.scss';

interface Props {
  messages: string[];
  isFetching: boolean;
  simulationRunning: boolean;
}

interface State {
  dragHandlePosition: number;
  visibleMessages: string[];
}

const messageBatchToShowNext = 30;

export class SimulationStatusLogger extends React.Component<Props, State> {

  simulationStatusLoggerBody: HTMLElement = null;

  private readonly _dragHandleMinPosition = 30;
  private readonly _dragHandleMaxPosition = document.body.clientHeight - 110;
  private readonly _logLevelAndColorTupleList = [
    ['FATAL', '#B71C1C'],
    ['ERROR', '#D32F2F'],
    ['WARN', '#FFFF00'],
    ['INFO', '#F0F4C3'],
    ['DEBUG', '#E1F5FE'],
    ['TRACE', '#C0CA33']
  ];
  private readonly _loggerBodyScrollNotifier = new Subject<number>();

  constructor(props: Props) {
    super(props);
    this.state = {
      dragHandlePosition: this._dragHandleMaxPosition,
      visibleMessages: props.messages.slice(0, messageBatchToShowNext)
    };
    this.mouseDown = this.mouseDown.bind(this);
    this._mouseUp = this._mouseUp.bind(this);
    this._resize = this._resize.bind(this);
    this.loadMoreMessages = this.loadMoreMessages.bind(this);
  }

  componentWillReceiveProps(newProps: Props) {
    if (newProps !== this.props && newProps.simulationRunning)
      this.setState({
        dragHandlePosition: 430
      });
  }

  componentDidMount() {
    this._loggerBodyScrollNotifier.pipe(
      debounceTime(250),
      filter(
        scrollTop => scrollTop === this.simulationStatusLoggerBody.scrollHeight - this.simulationStatusLoggerBody.clientHeight
      )
    )
      .subscribe({
        next: scrollTop => {
          // When the user scrolls to the bottom of the messages body
          // then just keep appending ${messageBatchToShowNext} more messages until there is no more
          if (this.state.visibleMessages.length < this.props.messages.length) {
            this.setState({
              visibleMessages: this.props.messages.slice(0, this.state.visibleMessages.length + messageBatchToShowNext)
            });
            // Move the scroll bar up to the previous scroll top position so that it does not just keep
            // sticking to the bottom and causes the messages to keep getting appended
            this.simulationStatusLoggerBody.scrollTop = scrollTop;
          }
        }
      });
  }

  componentWillUnmount() {
    this._loggerBodyScrollNotifier.complete();
  }

  render() {
    return (
      <div
        className='simulation-status-logger'
        style={{
          top: `${this.state.dragHandlePosition}px`
        }}>
        <header
          className='simulation-status-logger__header'
          onMouseDown={this.mouseDown} >
          <span className='simulation-status-logger__header__label'>Simulation Status</span>
          {
            this.props.messages.length > 0
            &&
            <div className='simulation-status-logger__header__legends'>
              {
                this._logLevelAndColorTupleList.map((tuple, i) => (
                  <div key={i} className='simulation-status-logger__header__legends__level'>
                    <span
                      className='simulation-status-logger__header__legends__level__color'
                      style={{ backgroundColor: tuple[1] }} />
                    <span className='simulation-status-logger__header__legends__level__label'>{tuple[0]}</span>
                  </div>
                ))
              }
            </div>
          }
        </header>
        <section
          className='simulation-status-logger__body'
          ref={elem => this.simulationStatusLoggerBody = elem}
          onScroll={this.loadMoreMessages}>
          {
            this.state.visibleMessages.map((message, i, messages) => (
              <SimulationStatusLoggerMessage key={messages.length - i} message={message} />
            ))
          }
        </section>
        <Wait show={this.props.isFetching} />
      </div>
    );
  }

  mouseDown() {
    this.simulationStatusLoggerBody.style.userSelect = 'none';
    document.documentElement.addEventListener('mousemove', this._resize, false);
    document.documentElement.addEventListener('mouseup', this._mouseUp, false);
  }

  private _mouseUp() {
    this.simulationStatusLoggerBody.style.userSelect = 'initial';
    window.getSelection().empty();
    document.documentElement.removeEventListener('mousemove', this._resize, false);
    document.documentElement.removeEventListener('mouseup', this._mouseUp, false);
  }

  private _resize(event) {
    const newPosition = Math.min(this._dragHandleMaxPosition, Math.max(event.clientY - 90, this._dragHandleMinPosition));
    this.setState({
      dragHandlePosition: newPosition
    });
  }

  loadMoreMessages() {
    this._loggerBodyScrollNotifier.next(this.simulationStatusLoggerBody.scrollTop);
  }

}
