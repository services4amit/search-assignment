# search-assignment


Design:

Database:  MongoDB. We can create indexes on the fields that will be used for searching, such as zipCode, addressIds, from and to.
We can use pagination to limit the number of results returned by the API endpoint. 
We can use the skip and limit parameters to paginate the results.


Time Taken:
Code setup 10 minutes.

Analysis and design for backend: 1 hour.

Writing Query: 4 hour

--adds

--persons

Local DB:"mongodb://localhost:27017/local"


Project setup:

npm install

 npm start





Request body validation check:

from must be on or after 1950-01-01:

http://localhost:3100/search?to=2022-01-01&status=@dead&zipCodes=121 

http://localhost:3100/search?from=1000-01-01&to=2022-01-01&status=@dead&zipCodes=121


to cannot be on or before from:

http://localhost:3100/search?from=2007-01-01&to=2000-01-01&status=@dead&zipCodes=121

One of zipCodes or addressIds must be provided:

http://localhost:3100/search?from=2007-01-01&to=2022-01-01&status=@dead

Use cases:

http://localhost:3100/search?from=2007-01-01&to=2022-01-01&status=@dead&zipCodes=121,122,144

http://localhost:3100/search?from=2007-01-01&to=2022-01-01&status=@alive&zipCodes=121,122,144

http://localhost:3100/search?from=2007-01-01&to=2022-01-01&zipCodes=121,122,144

http://localhost:3100/search?from=2007-01-01&zipCodes=121,122,144

http://localhost:3100/search?from=2007-01-01&to=2022-01-01&status=@dead&addressIds=1,2,4

http://localhost:3100/search?from=2007-01-01&to=2022-01-01&status=@alive&addressIds=1,2,4

http://localhost:3100/search?from=2007-01-01&to=2022-01-01&addressIds=1,2,4

http://localhost:3100/search?from=2007-01-01&addressIds=1,2,4

