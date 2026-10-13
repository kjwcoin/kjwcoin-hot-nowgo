import type {Visit} from './activity/model';
import type {PublicSourcedStore} from './sourced-store';
export type FootprintReportDraft={visit:Visit;store:{id:string;name:string;address:string;slug:string}|null;sourceStore:PublicSourcedStore|null;photoUrl:string|null};
