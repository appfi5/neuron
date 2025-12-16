import { BehaviorSubject } from 'rxjs'

const PerunRequestSubject = new BehaviorSubject({})
const PerunChannelSubject = new BehaviorSubject({})
const PerunRunnerStateSubject = new BehaviorSubject({ running: false } as Perun.RunnerStatus)

export { PerunRequestSubject, PerunChannelSubject, PerunRunnerStateSubject }
