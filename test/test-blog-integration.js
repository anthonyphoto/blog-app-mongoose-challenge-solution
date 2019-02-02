'use strict';

const chai = require("chai");
const chaiHttp = require("chai-http");
const faker = require("faker");
const mongoose = require("mongoose");

const expect = chai.expect;

const { BlogPost } = require("../models.js")
const { runServer, app, closeServer} = require("../server.js");
const {TEST_DATABASE_URL} =  require("../config.js");


chai.use(chaiHttp);


function seedBlogData() {
    const seedData = [];
    for (let i = 0; i < 10; i++) {
        seedData.push(generateBlogData());
    }
    return BlogPost.insertMany(seedData);
}

function generateBlogData(){
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.random.words(),
        content: faker.random.words(),
        created: faker.date.past()
    };
}

function tearDownDb() {
    console.warn('Deleting Database');
    return mongoose.connection.dropDatabase();
}

describe("Blog API Resource", function() {
    before(function(){
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function(){
        return seedBlogData();
    });

    afterEach(function(){
       return tearDownDb();
    });


    after(function(){
       return closeServer();
    });

    describe("GET endpoint", function() {
        it("should return all existing blogs", function(){
            let res;
            let resBlog;
            return chai.request(app)
                .get('/posts')
                .then(function(_res) {
                    // console.log(_res.body);
                    res = _res;
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('array');
                    expect(res.body).to.have.lengthOf.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count){
                    expect(res.body).to.have.lengthOf(count);
                    resBlog = res.body[0];
                    return BlogPost.findById(resBlog.id);
                })
                .then(function(dbBlog){
                    // console.log(dbBlog);
                    expect(resBlog.id).to.equal(dbBlog.id);
                    expect(resBlog.author).to.equal((dbBlog.author.firstName + ' ' + dbBlog.author.lastName).trim());
                    expect(resBlog.title).to.equal(dbBlog.title);
                    expect(resBlog.content).to.equal(dbBlog.content);
                    // expect(resBlog.created).to.equal(dbBlog.created);
                });
        });
    });

    describe('POST endpoint', function() {
        it("should add a new blog", function(){
            const newBlog = generateBlogData();
            return chai.request(app)
                .post('/posts')
                .send(newBlog)
                .then(function(res){
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('object');
                    expect(res.body.content).to.equal(newBlog.content);
                    expect(res.body.title).to.equal(newBlog.title);
                    return BlogPost.findById(res.body.id);
                    // console.log(res.body);
                })
                .then(function(dbBlog){
                    expect(dbBlog.content).to.equal(newBlog.content);
                    expect(dbBlog.title).to.equal(newBlog.title);
                });

        });
    });

    describe('PUT endpoint', function() {
        it("should update a blog", function(){

            const updateBlog = {
                title: 'test title',
                content: 'test content'
            }

            return BlogPost.findOne()
                .then(function(dbBlog){
                    updateBlog.id = dbBlog.id;
                    return chai.request(app)
                        .put(`/posts/${dbBlog.id}`)
                        .send(updateBlog)
                })
                .then(function(res){
                    expect(res).to.have.status(204);
                    return BlogPost.findById(updateBlog.id);
                })
                .then(function(dbBlog){
                    expect(dbBlog.title).to.equal(updateBlog.title);
                    expect(dbBlog.content).to.equal(updateBlog.content);
     
                });
        });
    });

    describe('DELETE endpoing', function(){
        it("should delete a blog", function(){
            let deleteId;
            return BlogPost.findOne()
                .then(function(dbBlog){
                    deleteId = dbBlog.id;
                    return chai.request(app)
                        .delete(`/posts/${deleteId}`)
                })
                .then(function(res){
                    expect(res).to.have.status(204);
                    return BlogPost.findById(deleteId);
                })
                .then(function(dbBlog){
                    expect(dbBlog).to.be.null;
                });

        });
    });
});
