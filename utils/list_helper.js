var _ = require('lodash')

const dummy = () => {
  return 1
}

const totalLikes = (blogs) => {
  return blogs.reduce((a, b) => b.likes + a, 0)
}

const favouriteBlog = (blogs) => {
  return blogs.length === 0 ? {} : blogs.reduce((a, b) => b.likes > a.likes ? b : a)
}

const mostBlogs = (blogs) => {
  if (blogs.length === 0) return {}
  const x = [...blogs.reduce((a, b) => {
    a.get(b.author) === undefined ? a.set(b.author,1) : a.set(b.author,a.get(b.author)+1)
    return a
  }, new Map()).entries()].reduce((a, e ) => e[1] > a[1] ? e : a)
  return { author:x[0], blogs:x[1] }
}

const mostLikes = (blogs) => {
  if (blogs.length === 0) return {}
  const x = [...blogs.reduce((a, b) => {
    a.get(b.author) === undefined ? a.set(b.author,b.likes) : a.set(b.author,a.get(b.author)+b.likes)
    return a
  }, new Map()).entries()].reduce((a, e ) => e[1] > a[1] ? e : a)
  return { author:x[0], likes:x[1] }
}

module.exports = {
  dummy, totalLikes, favouriteBlog, mostBlogs, mostLikes
}