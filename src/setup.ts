import dotenv from "dotenv";
import consoleStamp from 'console-stamp'
import moment from "moment";

dotenv.config()
consoleStamp(console, { format: ':date(yyyy-mm-dd HH:MM:ss) :label(7)', level: process.env.DEBUG == 'true' ? 'debug' : 'log' })
moment.locale('pt-br')
