const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const supertest = require('supertest')
const helper = require('./test_helper')
const app = require('../app')
const Blog = require('../models/blog')
const User = require('../models/user')

const api = supertest(app)


describe('when not authenticated', () => {
  beforeEach(async () => {
    await Blog.deleteMany({})
    await Blog.insertMany(helper.initialBlogs)

  })
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('blogs are identified by id', async () => {
    const response = await api
      .get('/api/blogs')
    response.body.forEach(blog => expect(blog.id).toBeDefined())
  })

  test('there are two blogs', async () => {
    const response = await api.get('/api/blogs')
    expect(response.body).toHaveLength(helper.initialBlogs.length)
  })
  test('a specific blog can be viewed', async () => {
    const blogsAtStart = await helper.blogsInDb()

    const blogToView = blogsAtStart[0]

    const resultBlog = await api
      .get(`/api/blogs/${blogToView.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const processedBlogToView = JSON.parse(JSON.stringify(blogToView))

    expect(resultBlog.body).toEqual(processedBlogToView)
  })
  test('the first blog is about HTTP methods', async () => {
    const response = await api.get('/api/blogs')
    const titles = response.body.map(r => r.title)
    expect(titles).toContain(
      'Go To Statement Considered Harmful'
    )
  })
  test('invlaid token gets rejected', async () => {
    const newBlog = {
      title: 'title',
      author: 'another author'
    }
    await api
      .post('/api/blogs')
      .set('Authorization', 'bearer ' + '1asdddasd23r4223')
      .send(newBlog)
      .expect(401)
  })
  test('a blog cannot be deleted', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    const result = await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('invalid token')

    const blogsAtEnd = await helper.blogsInDb()

    expect(blogsAtEnd).toHaveLength(
      helper.initialBlogs.length
    )
  })
  test('a specific blog cannot be updated', async () => {
    const blogsAtStart = await helper.blogsInDb()

    const blogToView = blogsAtStart[0]
    blogToView.title = 'modified'
    const result = await api
      .put(`/api/blogs/${blogToView.id}`)
      .send(blogToView)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(result.body.error).toContain('invalid token')
  })
})
describe('when authenticated', () => {
  const userHolder = {}
  beforeEach(async () => {
    await Blog.deleteMany({})
    await Blog.insertMany(helper.initialBlogs)
    await User.deleteMany({})
    const passwordHash = await bcrypt.hash('secret', 10)
    userHolder.username = 'root'
    userHolder.password = 'secret'

    const user = new User({ username: userHolder.username, passwordHash })
    await user.save()

    const token = await api.post('/api/login').send({
      username: userHolder.username,
      password: userHolder.password
    })
    userHolder.token = token.body.token

  })
  test('a valid blog can be added ', async () => {
    const newBlog = { title: 'Type wars', author: 'Robert C. Martin', url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html', likes: 2 }
    await api
      .post('/api/blogs')
      .set('Authorization', 'bearer ' + userHolder.token)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/)
    const response = await api.get('/api/blogs')
    const titles = response.body.map(r => r.title)
    expect(response.body).toHaveLength(helper.initialBlogs.length + 1)
    expect(titles).toContain(
      'Type wars'
    )
  })

  test('blog without title is not added', async () => {
    const newBlog = {
      author: 'another author'
    }
    await api
      .post('/api/blogs')
      .set('Authorization', 'bearer ' + userHolder.token)
      .send(newBlog)
      .expect(400)
    const response = await api.get('/api/blogs')
    expect(response.body).toHaveLength(helper.initialBlogs.length)
  })
  test('blog without author is not added', async () => {
    const newBlog = {
      title: 'title'
    }
    await api
      .post('/api/blogs')
      .set('Authorization', 'bearer ' + userHolder.token)
      .send(newBlog)
      .expect(400)
    const response = await api.get('/api/blogs')
    expect(response.body).toHaveLength(helper.initialBlogs.length)
  })

  test('blog gets 0 likes by default', async () => {
    const newBlog = {
      title: 'title',
      author: 'another author'
    }
    let response = await api
      .post('/api/blogs')
      .set('Authorization', 'bearer ' + userHolder.token)
      .send(newBlog)
    expect(response.body.likes).toBe(0)

    response = await api.get('/api/blogs')
    expect(response.body).toHaveLength(helper.initialBlogs.length + 1)
  })

  test('a specific blog can be updated', async () => {
    const newBlog = { title: 'Type wars - will be modified', author: 'Robert C. Martin', url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html', likes: 2 }
    const response = await api
      .post('/api/blogs')
      .set('Authorization', 'bearer ' + userHolder.token)
      .send(newBlog)

    const resultBlog = await api
      .put(`/api/blogs/${response.body.id.toString()}`)
      .set('Authorization', 'bearer ' + userHolder.token)
      .send({ ...newBlog, title:'modified' })

    expect(resultBlog.body.title).toEqual('modified')
  })

  test('a blog can be deleted', async () => {
    const newBlog = { title: 'Type wars - will be deleted', author: 'Robert C. Martin', url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html', likes: 2 }
    const response = await api
      .post('/api/blogs')
      .set('Authorization', 'bearer ' + userHolder.token)
      .send(newBlog)
    await api
      .delete(`/api/blogs/${response.body.id.toString()}`)
      .set('Authorization', 'bearer ' + userHolder.token)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()

    expect(blogsAtEnd).toHaveLength(
      helper.initialBlogs.length
    )

    const titles = blogsAtEnd.map(r => r.title)

    expect(titles).not.toContain(newBlog.title)
  })

})
afterAll(() => {
  mongoose.connection.close()
})